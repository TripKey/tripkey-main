"""SCR-04 동선 최적화 1차 — 이동시간 행렬 산출 + 순서 최적화 오케스트레이션 (#270).

Google Route Matrix(computeRouteMatrix) 1회 호출로 N×N 이동시간 행렬을 만들고,
키 부재/호출 실패/구간 누락 시 haversine 추정으로 보강한 뒤
route_order_optimizer 로 Day 내 방문 순서를 푼다. I/O 경계 모듈.
"""

from __future__ import annotations

import logging

import httpx

from app.fallback.estimated_route import estimate_leg
from app.schemas.parse import Coordinates
from app.schemas.route import (
    OptimizeOrderRequest,
    OptimizeOrderResponse,
    OptimizeStop,
    RouteLeg,
)
from app.services import route_matrix_cache
from app.services.route_optimizer import _parse_duration_seconds, _places_api_key
from app.services.route_order_optimizer import optimize_visit_order, path_duration

logger = logging.getLogger(__name__)

COMPUTE_ROUTE_MATRIX_URL = (
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
)


def _estimate_seconds(origin: Coordinates, destination: Coordinates) -> int:
    leg = RouteLeg(
        from_instance_id="o", to_instance_id="d", origin=origin, destination=destination
    )
    return estimate_leg(leg).duration_seconds


def _waypoint(coord: Coordinates) -> dict:
    return {"waypoint": {"location": {"latLng": {"latitude": coord.lat, "longitude": coord.lng}}}}


async def _call_route_matrix(stops: list[OptimizeStop], api_key: str) -> list[dict] | None:
    waypoints = [_waypoint(s.coordinates) for s in stops]
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,distanceMeters,condition",
        "Content-Type": "application/json",
    }
    payload = {"origins": waypoints, "destinations": waypoints, "travelMode": "DRIVE"}
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(COMPUTE_ROUTE_MATRIX_URL, json=payload, headers=headers)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("Route Matrix lookup failed | error=%s", exc)
        return None
    data = response.json()
    return data if isinstance(data, list) else None


async def _build_matrix(
    stops: list[OptimizeStop], api_key: str | None
) -> tuple[list[list[int]], str]:
    """N×N 이동시간(초) 행렬과 source('google'|'estimated') 반환.

    먼저 haversine 추정으로 채워(=폴백 기본값) 둔 뒤, Google 결과가 있으면 덮어쓴다.
    """
    n = len(stops)
    matrix = [[0] * n for _ in range(n)]
    for i in range(n):
        for j in range(n):
            if i != j:
                matrix[i][j] = _estimate_seconds(stops[i].coordinates, stops[j].coordinates)

    # pair_key 사전(캐시 조회/적재 공용)
    pair_keys: dict[tuple[int, int], str] = {}
    for i in range(n):
        for j in range(n):
            if i != j:
                a, b = stops[i].coordinates, stops[j].coordinates
                pair_keys[(i, j)] = route_matrix_cache.pair_key(a.lat, a.lng, b.lat, b.lng)

    # 1) L2 캐시 전체 히트면 Google 호출 생략 (Route Matrix 는 부분 캐시가 불가 → 전부 있어야 의미)
    if route_matrix_cache.cache_enabled():
        cached = await route_matrix_cache.get_durations(list(set(pair_keys.values())))
        if cached and all(k in cached for k in pair_keys.values()):
            for (i, j), k in pair_keys.items():
                matrix[i][j] = cached[k]
            return matrix, "google"

    # 2) 미스 또는 키 없음 → Route Matrix 1회 호출
    if not api_key:
        return matrix, "estimated"

    elements = await _call_route_matrix(stops, api_key)
    if not elements:
        return matrix, "estimated"

    rows: list[dict] = []
    for elem in elements:
        i = elem.get("originIndex")
        j = elem.get("destinationIndex")
        if i is None or j is None or i == j:
            continue
        if elem.get("condition") != "ROUTE_EXISTS":
            continue
        duration = _parse_duration_seconds(elem.get("duration"))
        if duration is None:
            continue
        matrix[i][j] = duration
        a, b = stops[i].coordinates, stops[j].coordinates
        rows.append({
            "pair_key": pair_keys[(i, j)],
            "origin_lat": route_matrix_cache.round_coord(a.lat),
            "origin_lng": route_matrix_cache.round_coord(a.lng),
            "dest_lat": route_matrix_cache.round_coord(b.lat),
            "dest_lng": route_matrix_cache.round_coord(b.lng),
            "mode": route_matrix_cache.MODE,
            "duration_seconds": duration,
            "distance_meters": elem.get("distanceMeters"),
        })

    # 3) 캐시 적재 (best-effort)
    if route_matrix_cache.cache_enabled():
        await route_matrix_cache.put_durations(rows)

    return matrix, "google"


async def optimize_order(request: OptimizeOrderRequest) -> OptimizeOrderResponse:
    ids = [s.instance_id for s in request.stops]
    if len(ids) <= 1:
        return OptimizeOrderResponse(
            ordered_instance_ids=list(ids), total_duration_seconds=0, source="estimated"
        )

    matrix, source = await _build_matrix(request.stops, _places_api_key())

    start_index = None
    if request.start_instance_id is not None and request.start_instance_id in ids:
        start_index = ids.index(request.start_instance_id)

    ordered_ids = optimize_visit_order(ids, matrix, start_index)
    order_idx = [ids.index(x) for x in ordered_ids]
    total = path_duration(order_idx, matrix)

    return OptimizeOrderResponse(
        ordered_instance_ids=ordered_ids,
        total_duration_seconds=total,
        source=source,
    )
