"""SCR-04 동선 최적화 — 이동시간 행렬 산출 + 순서 최적화 오케스트레이션 (#270, #274).

L2 캐시(route_matrix_cache)의 pair 는 그대로 쓰고(부분 히트 포함), 빠진 pair 는 개수에 따라
per-leg computeRoutes(소수) 또는 Route Matrix 1회(다수)로 채운다. 키 부재/호출 실패/구간 누락 시
haversine 추정으로 보강한 뒤 route_order_optimizer 로 Day 내 방문 순서를 푼다. I/O 경계 모듈.
"""

from __future__ import annotations

import asyncio
import logging
import os

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
from app.services.route_optimizer import (
    _call_routes_api,
    _parse_duration_seconds,
    _places_api_key,
)
from app.services.route_order_optimizer import optimize_visit_order, path_duration

logger = logging.getLogger(__name__)

COMPUTE_ROUTE_MATRIX_URL = (
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
)

# 빠진 pair 가 이 수 이하면 per-leg computeRoutes 로 그 pair만 호출(부분변경 granular 절감),
# 초과하면 Route Matrix 1회로 전체 재계산(cold 시 호출 수 폭증 방지). #274 Phase B.
PER_LEG_MAX_PAIRS = int(os.getenv("ROUTE_MATRIX_PER_LEG_MAX_PAIRS", "8"))


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


def _cache_row(a: Coordinates, b: Coordinates, key: str, duration: int, distance) -> dict:
    return {
        "pair_key": key,
        "origin_lat": route_matrix_cache.round_coord(a.lat),
        "origin_lng": route_matrix_cache.round_coord(a.lng),
        "dest_lat": route_matrix_cache.round_coord(b.lat),
        "dest_lng": route_matrix_cache.round_coord(b.lng),
        "mode": route_matrix_cache.MODE,
        "duration_seconds": duration,
        "distance_meters": distance,
    }


async def _fill_via_route_matrix(
    stops: list[OptimizeStop],
    api_key: str,
    matrix: list[list[int]],
    pair_keys: dict[tuple[int, int], str],
) -> bool:
    """Route Matrix 1회로 전체 pair 를 채우고 캐시에 적재. 성공 시 True."""
    elements = await _call_route_matrix(stops, api_key)
    if not elements:
        return False
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
        rows.append(_cache_row(a, b, pair_keys[(i, j)], duration, elem.get("distanceMeters")))
    if route_matrix_cache.cache_enabled():
        await route_matrix_cache.put_durations(rows)
    return True


async def _fill_via_per_leg(
    stops: list[OptimizeStop],
    api_key: str,
    matrix: list[list[int]],
    pair_keys: dict[tuple[int, int], str],
    missing: list[tuple[int, int]],
) -> bool:
    """빠진 pair 만 per-leg computeRoutes(DRIVE)로 병렬 호출하고 캐시에 적재. 1건이라도 성공 시 True."""
    results = await asyncio.gather(
        *[
            _call_routes_api(stops[i].coordinates, stops[j].coordinates, "DRIVE", api_key)
            for (i, j) in missing
        ]
    )
    rows: list[dict] = []
    for (i, j), result in zip(missing, results):
        if result is None:
            continue
        duration = result["duration_seconds"]
        matrix[i][j] = duration
        a, b = stops[i].coordinates, stops[j].coordinates
        rows.append(_cache_row(a, b, pair_keys[(i, j)], duration, result.get("distance_meters")))
    if rows and route_matrix_cache.cache_enabled():
        await route_matrix_cache.put_durations(rows)
    return bool(rows)


async def _build_matrix(
    stops: list[OptimizeStop], api_key: str | None
) -> tuple[list[list[int]], str]:
    """N×N 이동시간(초) 행렬과 source('google'|'estimated') 반환.

    haversine 추정으로 채운 뒤, L2 캐시의 pair 는 그대로 사용(부분 히트 포함)하고,
    빠진 pair 는 개수에 따라 per-leg computeRoutes(소수) 또는 Route Matrix 1회(다수)로 채운다(#274 Phase B).
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

    # 1) L2 캐시 조회 — 부분 히트도 채운다(Phase A 는 전체 히트만 사용했음)
    used_google = False
    if route_matrix_cache.cache_enabled():
        cached = await route_matrix_cache.get_durations(list(set(pair_keys.values())))
        for (i, j), k in pair_keys.items():
            if k in cached:
                matrix[i][j] = cached[k]
                used_google = True
        missing = [(i, j) for (i, j), k in pair_keys.items() if k not in cached]
    else:
        missing = list(pair_keys.keys())

    # 2) 전부 캐시 히트 → Google 호출 없음
    if not missing:
        return matrix, "google"

    # 3) 키 없음 → 남은 pair 는 추정 유지
    if not api_key:
        return matrix, "google" if used_google else "estimated"

    # 4) 하이브리드: 빠진 pair 가 적으면 per-leg, 많으면 Route Matrix 1회
    if len(missing) > PER_LEG_MAX_PAIRS:
        filled = await _fill_via_route_matrix(stops, api_key, matrix, pair_keys)
    else:
        filled = await _fill_via_per_leg(stops, api_key, matrix, pair_keys, missing)

    return matrix, "google" if (used_google or filled) else "estimated"


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

    end_index = None
    if request.end_instance_id is not None and request.end_instance_id in ids:
        end_index = ids.index(request.end_instance_id)
    if end_index == start_index:  # 같은 앵커(귀가 등)는 종료 자유로 (후속 슬라이스)
        end_index = None

    ordered_ids = optimize_visit_order(ids, matrix, start_index, end_index)
    order_idx = [ids.index(x) for x in ordered_ids]
    total = path_duration(order_idx, matrix)

    return OptimizeOrderResponse(
        ordered_instance_ids=ordered_ids,
        total_duration_seconds=total,
        source=source,
    )
