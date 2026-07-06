import os

import pytest

os.environ.setdefault("GOOGLE_MAPS_API_KEY", "test-maps-key")

from pydantic import ValidationError

from app.schemas.parse import Coordinates
from app.schemas.route import RouteLeg, RouteRequest


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
async def test_optimize_falls_back_when_leg_raises(monkeypatch) -> None:
    async def boom(origin, destination, travel_mode, api_key):
        raise RuntimeError("unexpected")

    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_optimizer, "_call_routes_api", boom)

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


from app.services import route_matrix_cache


def _leg_request() -> RouteRequest:
    return RouteRequest(legs=[RouteLeg(
        from_instance_id="a", to_instance_id="b",
        origin=Coordinates(lat=34.70, lng=135.50),
        destination=Coordinates(lat=34.67, lng=135.49),
    )])


@pytest.mark.asyncio
async def test_verify_shares_drive_pair_to_matrix_cache(monkeypatch) -> None:
    # #274 pair 공유: verify 미스에서 얻은 DRIVE 결과가 route_matrix_cache 에 교차 적재된다
    async def fake_call(origin, destination, travel_mode, api_key):
        table = {
            "WALK": {"duration_seconds": 3000, "distance_meters": 4000},
            "TRANSIT": {"duration_seconds": 1320, "distance_meters": 5400},
            "DRIVE": {"duration_seconds": 1500, "distance_meters": 5200},
        }
        return table[travel_mode]

    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_optimizer, "_call_routes_api", fake_call)
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    written: list[dict] = []

    async def capture_put(rows):
        written.extend(rows)

    monkeypatch.setattr(route_matrix_cache, "put_durations", capture_put)

    resp = await route_optimizer.optimize_routes(_leg_request())

    # 응답은 best-mode(transit) 그대로 — 공유 적재가 verify 결과를 바꾸면 안 됨
    assert resp.legs[0].mode == "transit"
    assert resp.legs[0].duration_seconds == 1320
    # 캐시에는 DRIVE 메트릭(1500)이 적재된다 (best-mode 1320 이 아니라)
    assert len(written) == 1
    row = written[0]
    assert row["mode"] == route_matrix_cache.MODE
    assert row["duration_seconds"] == 1500
    assert row["distance_meters"] == 5200
    assert row["pair_key"] == route_matrix_cache.pair_key(34.70, 135.50, 34.67, 135.49)


@pytest.mark.asyncio
async def test_no_share_when_cache_disabled(monkeypatch) -> None:
    async def fake_call(origin, destination, travel_mode, api_key):
        return {"duration_seconds": 600, "distance_meters": 2000}

    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_optimizer, "_call_routes_api", fake_call)
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: False)

    async def must_not_put(rows):
        raise AssertionError("캐시 비활성 시 교차 적재하면 안 됨")

    monkeypatch.setattr(route_matrix_cache, "put_durations", must_not_put)

    resp = await route_optimizer.optimize_routes(_leg_request())
    assert resp.legs[0].source == "google"


@pytest.mark.asyncio
async def test_no_share_when_drive_call_fails(monkeypatch) -> None:
    # DRIVE 만 실패 → best-mode 는 정상 반환하되 matrix 캐시 적재는 없어야 함
    async def fake_call(origin, destination, travel_mode, api_key):
        if travel_mode == "DRIVE":
            return None
        return {"duration_seconds": 900, "distance_meters": 1500}

    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_optimizer, "_call_routes_api", fake_call)
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    written: list[dict] = []

    async def capture_put(rows):
        written.extend(rows)

    monkeypatch.setattr(route_matrix_cache, "put_durations", capture_put)

    resp = await route_optimizer.optimize_routes(_leg_request())
    assert resp.legs[0].source == "google"
    assert written == []


from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_route_endpoint_returns_legs(monkeypatch) -> None:
    async def fake_call(origin, destination, travel_mode, api_key):
        return {"duration_seconds": 600, "distance_meters": 2000}

    monkeypatch.setattr(route_optimizer, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_optimizer, "_call_routes_api", fake_call)

    from app.main import app

    body = {"legs": [{
        "from_instance_id": "a", "to_instance_id": "b",
        "origin": {"lat": 34.70, "lng": 135.50},
        "destination": {"lat": 34.67, "lng": 135.49},
    }]}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/internal/ai/route", json=body)

    assert response.status_code == 200
    data = response.json()
    assert data["legs"][0]["from_instance_id"] == "a"
    assert data["legs"][0]["source"] == "google"
