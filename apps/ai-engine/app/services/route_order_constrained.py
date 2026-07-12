"""SCR-04 동선 최적화 Phase 2 — 제약 반영 OR-tools 라우팅 솔버 (#275).

제약(귀가 closed-tour / 고정 카드 위치 / 예약시각 time window)이 있을 때만 사용한다.
무제약 경로는 기존 route_order_optimizer(Held-Karp/2-opt)가 계속 담당한다.

- closed_tour: start 에서 출발해 모든 정점을 돌고 start 로 복귀(숙소 귀가).
- pinned_positions: {노드: 원래 위치} — 해당 노드를 방문 순서상 그 위치에 고정.
- time_windows: {노드: 방문 시작 시각 제약(일정 시작 기준 초)} — int 는 예약시각 고정 [t, t],
  (earliest, latest) 튜플은 영업시간 구간 창(#292). 일찍 도착하면 대기(slack), 창 밖이면 불능.
  service_times 가 체류 시간으로 누적된다.
- 자유 시작/종료는 0 비용 dummy 노드로 모델링한다(개방 경로 표준 기법).

해가 없으면(제약 충돌) None 을 반환한다 — 호출 측이 무제약 폴백을 수행한다.
순수 함수 — 외부 I/O 없음.
"""

from __future__ import annotations

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

# time dimension 상한(하루 일정 기준 넉넉한 지평선)
DAY_HORIZON_SECONDS = 20 * 3600
# n 이 작아(하루 카드 수) 최적해는 수 ms 내 도달 — GLS 는 시간제한까지 탐색하므로 짧게 둔다
SEARCH_TIME_LIMIT_MS = 200


def solve_constrained(
    matrix: list[list[int]],
    start: int | None = None,
    end: int | None = None,
    closed_tour: bool = False,
    pinned_positions: dict[int, int] | None = None,
    time_windows: dict[int, int | tuple[int, int]] | None = None,
    service_times: list[int] | None = None,
) -> list[int] | None:
    """제약을 만족하는 최소 이동시간 방문 순서(인덱스). 해가 없으면 None.

    time_windows 값은 방문 시작 시각 제약 — int 면 그 시각 고정(예약 [t, t]),
    (earliest, latest) 튜플이면 구간 창(영업시간 #292).
    """
    n = len(matrix)
    if n <= 1:
        return list(range(n))
    pinned_positions = pinned_positions or {}
    time_windows = {
        node: (w, w) if isinstance(w, int) else (int(w[0]), int(w[1]))
        for node, w in (time_windows or {}).items()
    }
    service_times = service_times or [0] * n

    if closed_tour and start is None:
        closed_tour = False  # 복귀 지점이 없으면 개방 경로로 강등

    # 자유 시작/종료 → 0 비용 dummy 노드. 양끝 모두 자유면 dummy 순환(=개방 경로) 기법.
    dummy: int | None = None
    if closed_tour:
        size = n
        manager = pywrapcp.RoutingIndexManager(size, 1, start)
    elif start is not None and end is not None:
        size = n
        manager = pywrapcp.RoutingIndexManager(size, 1, [start], [end])
    else:
        dummy = n
        size = n + 1
        if start is None and end is None:
            manager = pywrapcp.RoutingIndexManager(size, 1, dummy)
        else:
            starts = [start if start is not None else dummy]
            ends = [end if end is not None else dummy]
            manager = pywrapcp.RoutingIndexManager(size, 1, starts, ends)

    routing = pywrapcp.RoutingModel(manager)

    def _travel(from_index: int, to_index: int) -> int:
        a = manager.IndexToNode(from_index)
        b = manager.IndexToNode(to_index)
        if a == dummy or b == dummy:
            return 0
        return int(matrix[a][b])

    transit_cb = routing.RegisterTransitCallback(_travel)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_cb)

    # 고정 카드: 방문 순번 카운터(Order) 차원의 누적값을 원래 위치로 고정
    if pinned_positions:
        routing.AddConstantDimension(1, size + 1, True, "Order")
        order_dim = routing.GetDimensionOrDie("Order")
        # dummy 시작이면 실제 첫 정점의 순번이 1 부터 시작하므로 위치를 1 씩 민다
        offset = 1 if (dummy is not None and start is None and not closed_tour) else 0
        for node, pos in pinned_positions.items():
            routing.solver().Add(
                order_dim.CumulVar(manager.NodeToIndex(node)) == pos + offset
            )

    # 예약시각: Time 차원(이동 + 출발 정점 체류)의 누적값을 예약 시각으로 고정.
    # slack 이 대기를 흡수하므로 "일찍 도착 후 대기" 는 허용, 지각은 불능 처리된다.
    if time_windows:

        def _time(from_index: int, to_index: int) -> int:
            a = manager.IndexToNode(from_index)
            b = manager.IndexToNode(to_index)
            if a == dummy or b == dummy:
                return 0
            return int(matrix[a][b]) + int(service_times[a])

        time_cb = routing.RegisterTransitCallback(_time)
        routing.AddDimension(
            time_cb, DAY_HORIZON_SECONDS, DAY_HORIZON_SECONDS, True, "Time"
        )
        time_dim = routing.GetDimensionOrDie("Time")
        for node, (earliest, latest) in time_windows.items():
            time_dim.CumulVar(manager.NodeToIndex(node)).SetRange(earliest, latest)

    params = pywrapcp.DefaultRoutingSearchParameters()
    params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    params.time_limit.FromMilliseconds(SEARCH_TIME_LIMIT_MS)

    solution = routing.SolveWithParameters(params)
    if solution is None:
        return None

    order: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        if node != dummy:
            order.append(node)
        index = solution.Value(routing.NextVar(index))
    final = manager.IndexToNode(index)
    # closed tour 의 종점은 시작 정점 재방문이므로 제외, dummy 종점도 제외
    if not closed_tour and final != dummy:
        order.append(final)
    return order
