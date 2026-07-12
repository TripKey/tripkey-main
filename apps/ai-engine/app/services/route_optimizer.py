"""인접 카드 leg별 Google Routes(computeRoutes) 호출 + 최적 모드 선택.

설계 노트: 기존 destination_search/core_parse 와 동일하게 googlemaps 라이브러리
대신 httpx 로 신형 Routes v1 REST 를 직접 호출한다. walking/transit/driving 을
모두 조회해 duration 최소 모드 1개를 반환하고, 실패한 leg 는 직선거리 추정 폴백.

#274 pair 공유: 어차피 3모드를 호출하므로 그중 DRIVE 결과를 optimize 캐시
(route_matrix_cache, DRIVE 전용)에 교차 적재한다 — 추가 호출 0, 메트릭 충돌 0.
(역방향 matrix→legs 공유는 verify 의 best-mode 의미를 깨므로 하지 않는다.)
"""

from __future__ import annotations

import asyncio
import logging
import os

import httpx

from app.fallback.estimated_route import estimate_leg
from app.schemas.parse import Coordinates
from app.schemas.route import RouteLeg, RouteLegResult, RouteRequest, RouteResponse
from app.services import route_matrix_cache

logger = logging.getLogger(__name__)

COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"

# Google travelMode -> 응답에 노출할 소문자 모드명
_MODE_NAMES = {"WALK": "walking", "TRANSIT": "transit", "DRIVE": "driving"}
_TRAVEL_MODES = ("WALK", "TRANSIT", "DRIVE")


def _places_api_key() -> str | None:
    return os.getenv("GOOGLE_PLACES_API_KEY") or os.getenv("GOOGLE_MAPS_API_KEY")


def _parse_duration_seconds(raw: str | None) -> int | None:
    # Routes API 는 "1320s" 형태로 반환
    if not raw or not raw.endswith("s"):
        return None
    try:
        return int(float(raw[:-1]))
    except ValueError:
        return None


async def _call_routes_api(
    origin: Coordinates, destination: Coordinates, travel_mode: str, api_key: str
) -> dict | None:
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        "Content-Type": "application/json",
    }
    payload = {
        "origin": {"location": {"latLng": {"latitude": origin.lat, "longitude": origin.lng}}},
        "destination": {
            "location": {"latLng": {"latitude": destination.lat, "longitude": destination.lng}}
        },
        "travelMode": travel_mode,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(COMPUTE_ROUTES_URL, json=payload, headers=headers)
        response.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("Routes lookup failed | travel_mode=%s | error=%s", travel_mode, exc)
        return None

    routes = (response.json() or {}).get("routes") or []
    if not routes:
        return None
    first = routes[0]
    duration = _parse_duration_seconds(first.get("duration"))
    distance = first.get("distanceMeters")
    if duration is None or distance is None:
        return None
    return {"duration_seconds": duration, "distance_meters": int(distance)}


async def _optimize_leg(leg: RouteLeg, api_key: str) -> tuple[RouteLegResult, dict | None]:
    """leg 의 best-mode 결과와, 함께 얻은 DRIVE 결과의 matrix 캐시 row(없으면 None)."""
    candidates: list[tuple[str, dict]] = []
    for mode in _TRAVEL_MODES:
        result = await _call_routes_api(leg.origin, leg.destination, mode, api_key)
        if result is not None:
            candidates.append((mode, result))
    if not candidates:
        logger.warning(
            "No route candidates, falling back to estimate | from=%s | to=%s",
            leg.from_instance_id,
            leg.to_instance_id,
        )
        return estimate_leg(leg), None

    # #274 pair 공유 — DRIVE 후보는 optimize 캐시 row 로 변환(적재는 호출 측에서 일괄)
    drive = dict(candidates).get("DRIVE")
    drive_row = None
    if drive is not None:
        drive_row = route_matrix_cache.build_row(
            leg.origin.lat, leg.origin.lng,
            leg.destination.lat, leg.destination.lng,
            drive["duration_seconds"], drive["distance_meters"],
        )

    best_mode, best = min(candidates, key=lambda c: c[1]["duration_seconds"])
    return RouteLegResult(
        from_instance_id=leg.from_instance_id,
        to_instance_id=leg.to_instance_id,
        duration_seconds=best["duration_seconds"],
        distance_meters=best["distance_meters"],
        mode=_MODE_NAMES[best_mode],
        source="google",
    ), drive_row


async def optimize_routes(request: RouteRequest) -> RouteResponse:
    api_key = _places_api_key()
    if not api_key:
        logger.info(
            "verify legs stats | legs=%d google=0 estimated=%d drive_rows_shared=0 (no api key)",
            len(request.legs), len(request.legs),
        )
        return RouteResponse(legs=[estimate_leg(leg) for leg in request.legs])
    results = await asyncio.gather(
        *(_optimize_leg(leg, api_key) for leg in request.legs),
        return_exceptions=True,
    )

    legs: list[RouteLegResult] = []
    drive_rows: list[dict] = []
    for leg, result in zip(request.legs, results):
        if isinstance(result, Exception):
            logger.warning(
                "Leg optimization failed, falling back to estimate | from=%s | to=%s | error=%s",
                leg.from_instance_id,
                leg.to_instance_id,
                result,
            )
            legs.append(estimate_leg(leg))
            continue
        leg_result, drive_row = result
        legs.append(leg_result)
        if drive_row is not None:
            drive_rows.append(drive_row)

    # #274 pair 공유: verify 미스에서 얻은 DRIVE pair 를 optimize 캐시에 교차 적재.
    # 실패해도 무해(put_durations 내부 에러 무해화) — verify 응답에는 영향 없음.
    shared = 0
    if drive_rows and route_matrix_cache.cache_enabled():
        await route_matrix_cache.put_durations(drive_rows)
        shared = len(drive_rows)

    google_count = sum(1 for leg in legs if leg.source == "google")
    logger.info(
        "verify legs stats | legs=%d google=%d estimated=%d drive_rows_shared=%d",
        len(legs), google_count, len(legs) - google_count, shared,
    )
    return RouteResponse(legs=legs)
