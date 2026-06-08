"""Google Routes 실패·좌표 누락 시 haversine 직선거리 기반 추정 폴백."""

from __future__ import annotations

import math

from app.schemas.route import RouteLeg, RouteLegResult

# 도로 우회 보정 계수 및 평균 이동 속도(m/s). 직선거리 기반의 보수적 추정값.
_DETOUR_FACTOR = 1.3
_AVG_SPEED_MPS = 30_000 / 3600  # 30 km/h


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6_371_000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = math.sin(d_lat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(d_lng / 2) ** 2
    return radius * 2 * math.asin(math.sqrt(a))


def estimate_leg(leg: RouteLeg) -> RouteLegResult:
    straight = _haversine_meters(
        leg.origin.lat, leg.origin.lng, leg.destination.lat, leg.destination.lng
    )
    distance = int(round(straight * _DETOUR_FACTOR))
    duration = int(round(distance / _AVG_SPEED_MPS)) if distance > 0 else 0
    return RouteLegResult(
        from_instance_id=leg.from_instance_id,
        to_instance_id=leg.to_instance_id,
        duration_seconds=duration,
        distance_meters=distance,
        mode="estimated",
        source="estimated",
    )
