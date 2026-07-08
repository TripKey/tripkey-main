"""SCR-04 동선 최적화 Phase 2 — OR-tools 제약 솔버 단위 테스트 (#275)."""

import itertools

from app.services.route_order_constrained import solve_constrained
from app.services.route_order_optimizer import path_duration

# 비대칭 5x5 행렬 (기존 optimizer 테스트와 동일 값 — 완전탐색 대조용)
ASYM5 = [
    [0, 5, 9, 8, 7],
    [6, 0, 4, 11, 3],
    [10, 4, 0, 2, 6],
    [8, 12, 2, 0, 5],
    [7, 3, 6, 5, 0],
]


def _line_matrix(positions: list[int]) -> list[list[int]]:
    return [[abs(a - b) for b in positions] for a in positions]


def _cycle_duration(order: list[int], matrix: list[list[int]]) -> int:
    return path_duration(order, matrix) + matrix[order[-1]][order[0]]


def test_empty_and_single() -> None:
    assert solve_constrained([]) == []
    assert solve_constrained([[0]]) == [0]


def test_closed_tour_matches_brute_force() -> None:
    n = len(ASYM5)
    order = solve_constrained(ASYM5, start=2, closed_tour=True)
    assert order is not None and order[0] == 2
    assert sorted(order) == list(range(n))
    best = min(
        _cycle_duration([2, *p], ASYM5)
        for p in itertools.permutations([i for i in range(n) if i != 2])
    )
    assert _cycle_duration(order, ASYM5) == best


def test_closed_tour_without_start_degrades_to_open() -> None:
    # 복귀 지점이 없으면 개방 경로로 강등 — 유효 순열이면 된다
    order = solve_constrained(ASYM5, closed_tour=True)
    assert order is not None
    assert sorted(order) == list(range(len(ASYM5)))


def test_pinned_position_free_start() -> None:
    # 위치 A=0 B=10 C=20 D=30, 입력 순서 C,A,D,B — B(입력 3) 를 3번째 위치에 고정
    m = _line_matrix([20, 0, 30, 10])
    order = solve_constrained(m, pinned_positions={3: 3})
    assert order is not None and order[3] == 3
    # B 마지막 고정 시 유일 최적: D → C → A → B (10+20+10 = 40)
    assert order == [2, 0, 1, 3]
    assert path_duration(order, m) == 40


def test_pinned_position_with_start_anchor_matches_brute_force() -> None:
    n = len(ASYM5)
    order = solve_constrained(ASYM5, start=2, pinned_positions={4: 1})
    assert order is not None and order[0] == 2 and order[1] == 4
    got = path_duration(order, ASYM5)
    best = min(
        path_duration([2, 4, *p], ASYM5)
        for p in itertools.permutations([i for i in range(n) if i not in (2, 4)])
    )
    assert got == best


def test_reserved_time_forces_reorder() -> None:
    # S(0) R(1) X(2) Y(3). 무제약 최적은 S→X→Y→R(70) 이지만 R 도착이 70초 > 예약 60초 → 불능.
    # 예약을 지키는 유일 최적은 S→R→X→Y (75).
    m = [
        [0, 60, 5, 50],
        [60, 0, 10, 50],
        [60, 60, 0, 5],
        [60, 60, 50, 0],
    ]
    free = solve_constrained(m, start=0, pinned_positions={1: 3})  # sanity: R 마지막 고정땐 70
    assert free is not None and path_duration(free, m) == 70

    order = solve_constrained(m, start=0, time_windows={1: 60})
    assert order == [0, 1, 2, 3]


def test_service_time_counts_toward_reservation() -> None:
    # S(0) A(1) R(2). A 체류 100초 때문에 S→A→R 은 R 도착 120초 > 예약 60초 → S→R→A 로 재배열.
    m = [
        [0, 10, 60],
        [10, 0, 10],
        [60, 10, 0],
    ]
    order = solve_constrained(
        m, start=0, time_windows={2: 60}, service_times=[0, 100, 0]
    )
    assert order == [0, 2, 1]


def test_infeasible_reservation_returns_none() -> None:
    # 예약 시각 0초인데 어느 경로로도 이동시간 > 0 → 해 없음
    m = _line_matrix([0, 100, 200])
    assert solve_constrained(m, start=0, time_windows={2: 0}) is None


def test_infeasible_pin_returns_none() -> None:
    # 시작 앵커(위치 0)와 다른 노드를 위치 0 에 고정 → 충돌
    m = _line_matrix([0, 100, 200])
    assert solve_constrained(m, start=0, pinned_positions={2: 0}) is None


def test_start_and_end_anchor_with_pin() -> None:
    n = len(ASYM5)
    order = solve_constrained(ASYM5, start=2, end=0, pinned_positions={4: 2})
    assert order is not None
    assert order[0] == 2 and order[-1] == 0 and order[2] == 4
    got = path_duration(order, ASYM5)
    mids = [i for i in range(n) if i not in (2, 0, 4)]
    best = min(
        path_duration([2, p[0], 4, p[1], 0], ASYM5)
        for p in itertools.permutations(mids)
    )
    assert got == best


def test_end_anchor_only_with_window() -> None:
    # 시작 자유(dummy) + 종료 앵커 + 예약. dummy 오프셋 경로 검증.
    m = _line_matrix([0, 10, 20, 30])
    order = solve_constrained(m, end=0, time_windows={2: 40})
    assert order is not None
    assert order[-1] == 0 and sorted(order) == [0, 1, 2, 3]
