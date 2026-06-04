import os

import pytest

os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-maps-key")

from pydantic import ValidationError

from app.schemas.parse import Coordinates
from app.schemas.route import RouteLeg, RouteLegResult, RouteRequest, RouteResponse


def test_schema_roundtrip() -> None:
    req = RouteRequest(legs=[RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )])
    assert req.legs[0].origin.lat == 34.70


def test_route_leg_rejects_empty_instance_id() -> None:
    with pytest.raises(ValidationError):
        RouteLeg(
            from_instance_id="", to_instance_id="b",
            origin=Coordinates(lat=34.70, lng=135.50),
            destination=Coordinates(lat=34.67, lng=135.49),
        )


from app.fallback.estimated_route import estimate_leg


def test_estimate_leg_returns_estimated_source() -> None:
    leg = RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )
    result = estimate_leg(leg)
    assert result.source == "estimated"
    assert result.mode == "estimated"
    assert result.distance_meters > 0
    assert result.duration_seconds > 0
    assert result.from_instance_id == "a"
    assert result.to_instance_id == "b"


from app.services import route_optimizer
from app.schemas.route import RouteRequest


@pytest.mark.asyncio
async def test_optimize_picks_min_duration_mode(monkeypatch) -> None:
    async def fake_call(origin, destination, travel_mode, api_key):
        table = {
            "WALK": {"duration_seconds": 3000, "distance_meters": 4000},
            "TRANSIT": {"duration_seconds": 1320, "distance_meters": 5400},
            "DRIVE": {"duration_seconds": 1500, "distance_meters": 5200},
        }
        return table[travel_mode]

    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_optimizer, "_call_routes_api", fake_call)

    req = RouteRequest(legs=[RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )])
    resp = await route_optimizer.optimize_routes(req)

    leg = resp.legs[0]
    assert leg.mode == "transit"
    assert leg.source == "google"
    assert leg.duration_seconds == 1320


@pytest.mark.asyncio
async def test_optimize_falls_back_when_google_returns_nothing(monkeypatch) -> None:
    async def fake_call(origin, destination, travel_mode, api_key):
        return None

    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_optimizer, "_call_routes_api", fake_call)

    req = RouteRequest(legs=[RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )])
    resp = await route_optimizer.optimize_routes(req)
    assert resp.legs[0].source == "estimated"


@pytest.mark.asyncio
async def test_optimize_falls_back_when_no_api_key(monkeypatch) -> None:
    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: None)
    req = RouteRequest(legs=[RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )])
    resp = await route_optimizer.optimize_routes(req)
    assert resp.legs[0].source == "estimated"
