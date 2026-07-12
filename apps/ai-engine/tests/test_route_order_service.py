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
async def test_respects_end_anchor(monkeypatch) -> None:
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    elements = _line_matrix_elements()

    async def fake_post(self, url, json, headers):
        return httpx.Response(200, json=elements, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=_stops(), end_instance_id="A")  # A(@0) 에서 종료 고정
    )
    assert res.source == "google"
    assert res.ordered_instance_ids[-1] == "A"


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


@pytest.mark.asyncio
async def test_partial_cache_miss_uses_per_leg(monkeypatch) -> None:
    # 12 pair 중 소수만 미스 → Route Matrix 전체 재계산이 아니라 per-leg 로 빠진 pair 만 호출 (#274 Phase B)
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    async def partial_get(keys):
        ks = list(keys)
        return {k: 600 for k in ks[:-2]}  # 마지막 2개만 미스

    monkeypatch.setattr(route_matrix_cache, "get_durations", partial_get)

    put_rows: list[dict] = []

    async def capture_put(rows):
        put_rows.extend(rows)

    monkeypatch.setattr(route_matrix_cache, "put_durations", capture_put)

    calls = {"n": 0}

    async def fake_routes(origin, destination, travel_mode, api_key):
        calls["n"] += 1
        assert travel_mode == "DRIVE"
        return {"duration_seconds": 300, "distance_meters": 1000}

    monkeypatch.setattr(svc, "_call_routes_api", fake_routes)

    async def must_not_call_matrix(self, *args, **kwargs):
        raise AssertionError("부분 미스 시 computeRouteMatrix 를 호출하면 안 됨")

    monkeypatch.setattr(httpx.AsyncClient, "post", must_not_call_matrix)

    res = await svc.optimize_order(OptimizeOrderRequest(stops=_stops()))
    assert calls["n"] == 2            # 빠진 pair 만 per-leg 호출
    assert len(put_rows) == 2         # 빠진 pair 만 캐시 적재
    assert res.source == "google"


@pytest.mark.asyncio
async def test_closed_tour_when_start_equals_end(monkeypatch) -> None:
    # 시작=종료 앵커(숙소 귀가) → 복귀 비용 포함 closed-tour 최적화 (#275)
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    elements = _line_matrix_elements()

    async def fake_post(self, url, json, headers):
        return httpx.Response(200, json=elements, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=_stops(), start_instance_id="C", end_instance_id="C")
    )
    assert res.source == "google"
    assert res.ordered_instance_ids[0] == "C"
    assert sorted(res.ordered_instance_ids) == ["A", "B", "C", "D"]
    # 일직선 순환 비용 = 2 × 전체 구간(30) = 60 (복귀 구간 포함)
    assert res.total_duration_seconds == 60


@pytest.mark.asyncio
async def test_pinned_stop_keeps_position(monkeypatch) -> None:
    # 고정 카드(pin): B(입력 3번째, 예약시각 없음) 는 그 위치 그대로 유지 (#275)
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    elements = _line_matrix_elements()

    async def fake_post(self, url, json, headers):
        return httpx.Response(200, json=elements, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)

    stops = _stops()
    stops[3] = stops[3].model_copy(update={"pinned": True})  # B @ index 3
    res = await svc.optimize_order(OptimizeOrderRequest(stops=stops))
    assert res.ordered_instance_ids[3] == "B"
    # B 마지막 고정 시 유일 최적: D → C → A → B (40)
    assert res.ordered_instance_ids == ["D", "C", "A", "B"]
    assert res.total_duration_seconds == 40


@pytest.mark.asyncio
async def test_constraints_wired_to_solver(monkeypatch) -> None:
    # 예약시각/고정/체류시간이 제약 솔버 인자로 올바르게 전달되는지 (#275)
    monkeypatch.setattr(svc, "_places_api_key", lambda: None)

    captured = {}

    def fake_solve(matrix, start=None, end=None, closed_tour=False,
                   pinned_positions=None, time_windows=None, service_times=None):
        captured.update(
            start=start, end=end, closed_tour=closed_tour,
            pins=pinned_positions, windows=time_windows, services=service_times,
        )
        return [1, 0, 3, 2]

    monkeypatch.setattr(svc, "solve_constrained", fake_solve)

    stops = _stops()
    stops[0] = stops[0].model_copy(update={"reserved_time": "14:30", "duration_min": 90})
    stops[2] = stops[2].model_copy(update={"open_time": "10:00", "close_time": "18:00"})
    stops[3] = stops[3].model_copy(update={"pinned": True})
    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=stops, start_instance_id="A")
    )
    assert captured["start"] == 1 and captured["end"] is None
    assert captured["closed_tour"] is False
    reserved = (14 * 3600 + 30 * 60) - svc.DAY_START_SECONDS
    # 예약 = [t, t] 고정, 영업시간 = [open, close] 구간 창 (#292)
    assert captured["windows"] == {
        0: (reserved, reserved),
        2: (3600, 9 * 3600),  # 10:00~18:00 → 09:00 기준 +1h ~ +9h
    }
    assert captured["pins"] == {3: 3}
    assert captured["services"][0] == 90 * 60
    assert res.ordered_instance_ids == ["A", "C", "B", "D"]


@pytest.mark.asyncio
async def test_infeasible_constraints_fall_back_to_unconstrained(monkeypatch) -> None:
    # 제약 충돌(해 없음) 시 무제약 최적화로 폴백 — 귀가(복귀) 비용도 미포함 (#275)
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    elements = _line_matrix_elements()

    async def fake_post(self, url, json, headers):
        return httpx.Response(200, json=elements, request=httpx.Request("POST", url))

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    monkeypatch.setattr(svc, "solve_constrained", lambda *a, **k: None)

    res = await svc.optimize_order(
        OptimizeOrderRequest(stops=_stops(), start_instance_id="C", end_instance_id="C")
    )
    assert res.ordered_instance_ids == ["C", "D", "B", "A"]  # 개방 경로 폴백
    assert res.total_duration_seconds == 40


def test_blend_walk_estimates_prefers_walk_on_short_legs() -> None:
    # 약 90m 구간: DRIVE 600초보다 도보 추정이 빠르면 min 으로 대체 (#275 mode)
    stops = [
        OptimizeStop(instance_id="P", coordinates=Coordinates(lat=34.70, lng=135.5000)),
        OptimizeStop(instance_id="Q", coordinates=Coordinates(lat=34.70, lng=135.5010)),
    ]
    matrix = [[0, 600], [600, 0]]
    svc._blend_walk_estimates(stops, matrix)
    walk = svc._walk_seconds(stops[0].coordinates, stops[1].coordinates)
    assert walk < 600
    assert matrix[0][1] == walk and matrix[1][0] == walk


def test_blend_walk_keeps_drive_on_long_legs() -> None:
    # 약 9km 구간: 도보 추정(수천 초)보다 DRIVE 600초가 빠르면 유지
    stops = [
        OptimizeStop(instance_id="P", coordinates=Coordinates(lat=34.70, lng=135.50)),
        OptimizeStop(instance_id="Q", coordinates=Coordinates(lat=34.70, lng=135.60)),
    ]
    matrix = [[0, 600], [600, 0]]
    svc._blend_walk_estimates(stops, matrix)
    assert matrix[0][1] == 600 and matrix[1][0] == 600


def test_reserved_seconds_parsing() -> None:
    assert svc._reserved_seconds("14:30") == (14 * 3600 + 30 * 60) - svc.DAY_START_SECONDS
    assert svc._reserved_seconds("09:00") == 0
    assert svc._reserved_seconds("07:00") == 0  # 일정 시작 이전은 0 으로 클램프
    assert svc._reserved_seconds("9:05") == 300
    assert svc._reserved_seconds(None) is None
    assert svc._reserved_seconds("") is None
    assert svc._reserved_seconds("25:00") is None
    assert svc._reserved_seconds("정오쯤") is None


@pytest.mark.asyncio
async def test_many_misses_use_route_matrix_not_per_leg(monkeypatch) -> None:
    # 미스가 임계(PER_LEG_MAX_PAIRS=8)보다 많으면 per-leg 대신 Route Matrix 1회 (cold 폭증 방지)
    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    async def empty_cache(keys):
        return {}

    monkeypatch.setattr(route_matrix_cache, "get_durations", empty_cache)

    async def noop_put(rows):
        return None

    monkeypatch.setattr(route_matrix_cache, "put_durations", noop_put)

    async def must_not_per_leg(*args, **kwargs):
        raise AssertionError("미스가 많으면 per-leg 가 아니라 Route Matrix 를 써야 함")

    monkeypatch.setattr(svc, "_call_routes_api", must_not_per_leg)

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


@pytest.mark.asyncio
async def test_matrix_stats_logged_on_full_hit(monkeypatch, caplog) -> None:
    # 적중률/과금 모니터링(#274): 전체 히트 시 stats 로그(cache_hits=전체, billed=0)
    import logging

    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    stops = _stops()
    cached = {}
    for i in range(4):
        for j in range(4):
            if i != j:
                a, b = stops[i].coordinates, stops[j].coordinates
                cached[route_matrix_cache.pair_key(a.lat, a.lng, b.lat, b.lng)] = 100

    async def fake_get_durations(keys):
        return cached

    monkeypatch.setattr(route_matrix_cache, "get_durations", fake_get_durations)

    with caplog.at_level(logging.INFO, logger="app.services.route_order_service"):
        await svc.optimize_order(OptimizeOrderRequest(stops=stops))

    stats = [r.getMessage() for r in caplog.records if "route_matrix stats" in r.getMessage()]
    assert len(stats) == 1
    assert "pairs=12 cache_hits=12 misses=0 fill=none billed_elements=0" in stats[0]


@pytest.mark.asyncio
async def test_matrix_stats_logged_on_per_leg_fill(monkeypatch, caplog) -> None:
    # 부분 미스 per-leg 경로: misses/billed_elements 가 빠진 pair 수와 일치해야 한다
    import logging

    monkeypatch.setattr(svc, "_places_api_key", lambda: "k")
    monkeypatch.setattr(route_matrix_cache, "cache_enabled", lambda: True)

    async def partial_get(keys):
        ks = list(keys)
        return {k: 600 for k in ks[:-2]}  # 마지막 2개만 미스

    monkeypatch.setattr(route_matrix_cache, "get_durations", partial_get)

    async def noop_put(rows):
        return None

    monkeypatch.setattr(route_matrix_cache, "put_durations", noop_put)

    async def fake_routes(origin, destination, travel_mode, api_key):
        return {"duration_seconds": 300, "distance_meters": 1000}

    monkeypatch.setattr(svc, "_call_routes_api", fake_routes)

    with caplog.at_level(logging.INFO, logger="app.services.route_order_service"):
        await svc.optimize_order(OptimizeOrderRequest(stops=_stops()))

    stats = [r.getMessage() for r in caplog.records if "route_matrix stats" in r.getMessage()]
    assert len(stats) == 1
    assert "pairs=12 cache_hits=10 misses=2 fill=per-leg billed_elements=2" in stats[0]


def test_opening_window_parsing() -> None:
    # 영업시간 → 일정 시작(09:00) 기준 초 구간. 유효하지 않으면 None (#292)
    def stop(open_time, close_time):
        return OptimizeStop(
            instance_id="x", coordinates=Coordinates(lat=1.0, lng=2.0),
            open_time=open_time, close_time=close_time,
        )

    assert svc._opening_window(stop("10:00", "18:00")) == (3600, 9 * 3600)
    assert svc._opening_window(stop("07:00", "22:00")) == (0, 13 * 3600)  # 09:00 이전은 0 클램프
    assert svc._opening_window(stop(None, None)) is None
    assert svc._opening_window(stop("10:00", None)) is None
    assert svc._opening_window(stop("07:00", "08:30")) is None  # 일정 시작 전에 닫음 → 제약 무의미
    assert svc._opening_window(stop("18:00", "10:00")) is None  # 역전 구간
    assert svc._opening_window(stop("정오", "18:00")) is None  # 형식 오류


@pytest.mark.asyncio
async def test_reserved_time_overrides_opening_hours(monkeypatch) -> None:
    # 같은 카드에 예약시각과 영업시간이 모두 있으면 예약(고정 창)이 우선 (#292)
    monkeypatch.setattr(svc, "_places_api_key", lambda: None)

    captured = {}

    def fake_solve(matrix, start=None, end=None, closed_tour=False,
                   pinned_positions=None, time_windows=None, service_times=None):
        captured["windows"] = time_windows
        return [0, 1, 2, 3]

    monkeypatch.setattr(svc, "solve_constrained", fake_solve)

    stops = _stops()
    stops[1] = stops[1].model_copy(update={
        "reserved_time": "12:00", "open_time": "10:00", "close_time": "18:00",
    })
    await svc.optimize_order(OptimizeOrderRequest(stops=stops))
    assert captured["windows"] == {1: (3 * 3600, 3 * 3600)}  # 12:00 예약 고정
