"""인접 카드 leg별 Google Routes(computeRoutes) 호출 + 최적 모드 선택.

설계 노트: 기존 destination_search/core_parse 와 동일하게 googlemaps 라이브러리
대신 httpx 로 신형 Routes v1 REST 를 직접 호출한다. walking/transit/driving 을
모두 조회해 duration 최소 모드 1개를 반환하고, 실패한 leg 는 직선거리 추정 폴백.
"""

from __future__ import annotations

import asyncio
import os

import httpx

from app.fallback.estimated_route import estimate_leg
from app.schemas.parse import Coordinates
from app.schemas.route import RouteLeg, RouteLegResult, RouteRequest, RouteResponse

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
    except httpx.HTTPError:
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


async def _optimize_leg(leg: RouteLeg, api_key: str) -> RouteLegResult:
    candidates: list[tuple[str, dict]] = []
    for mode in _TRAVEL_MODES:
        result = await _call_routes_api(leg.origin, leg.destination, mode, api_key)
        if result is not None:
            candidates.append((mode, result))
    if not candidates:
        return estimate_leg(leg)
    best_mode, best = min(candidates, key=lambda c: c[1]["duration_seconds"])
    return RouteLegResult(
        from_instance_id=leg.from_instance_id,
        to_instance_id=leg.to_instance_id,
        duration_seconds=best["duration_seconds"],
        distance_meters=best["distance_meters"],
        mode=_MODE_NAMES[best_mode],
        source="google",
    )


async def optimize_routes(request: RouteRequest) -> RouteResponse:
    api_key = _places_api_key()
    if not api_key:
        return RouteResponse(legs=[estimate_leg(leg) for leg in request.legs])
    results = await asyncio.gather(*(_optimize_leg(leg, api_key) for leg in request.legs))
    return RouteResponse(legs=list(results))
