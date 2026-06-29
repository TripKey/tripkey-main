"""SCR-04 동선 최적화 1차 — 행렬 산출 + 오케스트레이션 테스트 (#270)."""

import httpx
import pytest

from app.schemas.parse import Coordinates
from app.schemas.route import OptimizeOrderRequest, OptimizeStop
from app.services import route_matrix_cache
from app.services import route_order_service as svc


def _stops() -> list[OptimizeStop]:
    # 위도 고정, 경도만 증가하는 일직선 점: A < B < C < D
    return [
        OptimizeStop(instance_id="C", coordinates=Coordinates(lat=34.70, lng=135.520)),
        OptimizeStop(instance_id="A", coordinates=Coordinates(lat=34.70, lng=135.500)),
        OptimizeStop(instance_id="D", coordinates=Coordinates(lat=34.70, lng=135.530)),
        OptimizeStop(instance_id="B", coordinates=Coordinates(lat=34.70, lng=135.510)),
    ]


def _line_matrix_elements() -> list[dict]:
    # 입력 index 기준 위치(초): C=20, A=0, D=30, B=10
    pos = {0: 20, 1: 0, 2: 30, 3: 10}
    elements = []
    for i in range(4):
        for j in range(4):
            if i == j:
                continue
            elements.append(
                {
                    "originIndex": i,
                    "destinationIndex": j,
                    "duration": f"{abs(pos[i] - pos[j])}s",
                    "condition": "ROUTE_EXISTS",
                }
            )
    return elements


@pytest.mark.asyncio
async def test_no_api_key_uses_estimate(monkeypatch) -> None:
    monkeypatch.setattr(svc, "_places_api_key", lambda: None)
    res = await svc.optimize_order(OptimizeOrderRequest(stops=_stops()))
    assert res.source == "estimated"
    assert sorted(res.ordered_instance_ids) == ["A", "B", "C", "D"]
    # 일직선이라 최적 개방 경로는 정렬 순서 또는 그 역순
    assert res.ordered_instance_ids in (["A", "B", "C", "D"], ["D", "C", "B", "A"])
    assert res.total_duration_seconds > 0


@pytest.mark.asyncio
async def test_respects_start_with_google_matrix(monkeypatch) -> None:
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    elements = _line_matrix_elements()

    async def fake_post(self, url, json, headers):
        return httpx.Response(200, json=elements, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=_stops(), start_instance_id="C")
    )
    assert res.source == "google"
    assert res.ordered_instance_ids[0] == "C"
    assert res.ordered_instance_ids == ["C", "D", "B", "A"]  # C 시작 최소 = 40
    assert res.total_duration_seconds == 40


@pytest.mark.asyncio
async def test_http_failure_falls_back_to_estimate(monkeypatch) -> None:
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")

    async def fake_post(self, url, json, headers):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    res = await svc.optimize_order(OptimizeOrderRequest(stops=_stops()))
    assert res.source == "estimated"
    assert sorted(res.ordered_instance_ids) == ["A", "B", "C", "D"]


@pytest.mark.asyncio
async def test_single_stop_is_trivial(monkeypatch) -> None:
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    res = await svc.optimize_order(
        OptimizeOrderRequest(
            stops=[OptimizeStop(instance_id="solo", coordinates=Coordinates(lat=1.0, lng=2.0))]
        )
    )
    assert res.ordered_instance_ids == ["solo"]
    assert res.total_duration_seconds == 0


@pytest.mark.asyncio
async def test_endpoint_returns_optimized_order(monkeypatch) -> None:
    from fastapi.testclient import TestClient

    from app.main import app

    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    elements = _line_matrix_elements()

    async def fake_post(self, url, json, headers):
        return httpx.Response(200, json=elements, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    payload = {
        "stops": [
            {"instance_id": "C", "coordinates": {"lat": 34.70, "lng": 135.520}},
            {"instance_id": "A", "coordinates": {"lat": 34.70, "lng": 135.500}},
            {"instance_id": "D", "coordinates": {"lat": 34.70, "lng": 135.530}},
            {"instance_id": "B", "coordinates": {"lat": 34.70, "lng": 135.510}},
        ],
        "start_instance_id": "C",
    }
    client = TestClient(app)
    resp = client.post("/internal/ai/route/optimize-order", json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["ordered_instance_ids"] == ["C", "D", "B", "A"]
    assert body["total_duration_seconds"] == 40
    assert body["source"] == "google"


@pytest.mark.asyncio
async def test_handles_unordered_matrix_elements(monkeypatch) -> None:
    # 실 computeRouteMatrix 는 요소를 인덱스 순서대로 주지 않는다.
    # 파서가 originIndex/destinationIndex 로 배치하므로 셔플돼도 결과가 같아야 한다.
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    elements = _line_matrix_elements()
    shuffled = list(reversed(elements))  # 순서를 일부러 뒤집음

    async def fake_post(self, url, json, headers):
        return httpx.Response(200, json=shuffled, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=_stops(), start_instance_id="C")
    )
    assert res.source == "google"
    assert res.ordered_instance_ids == ["C", "D", "B", "A"]
    assert res.total_duration_seconds == 40


@pytest.mark.asyncio
async def test_full_cache_hit_skips_route_matrix(monkeypatch) -> None:
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    stops = _stops()
    pos = {0: 20, 1: 0, 2: 30, 3: 10}  # 입력 index 기준 위치(초)
    cached = {}
    for i in range(4):
        for j in range(4):
            if i != j:
                a, b = stops[i].coordinates, stops[j].coordinates
                cached[route_matrix_cache.pair_key(a.lat, a.lng, b.lat, b.lng)] = abs(pos[i] - pos[j])

    async def fake_get_durations(keys):
        return cached

    monkeypatch.setattr(route_matrix_cache, "get_durations", fake_get_durations)

    async def must_not_call(self, *args, **kwargs):
        raise AssertionError("전체 캐시 히트 시 Route Matrix 를 호출하면 안 됨")

    monkeypatch.setattr(httpx.AsyncClient, "post", must_not_call)

    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=stops, start_instance_id="C")
    )
    assert res.source == "google"
    assert res.ordered_instance_ids == ["C", "D", "B", "A"]
    assert res.total_duration_seconds == 40


@pytest.mark.asyncio
async def test_cache_miss_calls_matrix_and_writes(monkeypatch) -> None:
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    async def empty_cache(keys):
        return {}

    monkeypatch.setattr(route_matrix_cache, "get_durations", empty_cache)

    written = {}

    async def capture_put(rows):
        written["rows"] = rows

    monkeypatch.setattr(route_matrix_cache, "put_durations", capture_put)

    elements = _line_matrix_elements()

    async def fake_post(self, url, *args, **kwargs):
        return httpx.Response(200, json=elements, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=_stops(), start_instance_id="C")
    )
    assert res.source == "google"
    assert res.ordered_instance_ids == ["C", "D", "B", "A"]
    assert res.total_duration_seconds == 40
    # 4x4 - 대각 4 = 12 pair 가 캐시에 적재돼야 한다
    assert "rows" in written and len(written["rows"]) == 12
    assert all("pair_key" in r and "duration_seconds" in r for r in written["rows"])
