"""SCR-04 동선 최적화 1차 — Day 내 방문 순서 최적화기 단위 테스트 (#270)."""

import itertools
import random

from app.services.route_order_optimizer import (
    optimize_visit_order,
    path_duration,
)


def _line_matrix(positions: list[int]) -> list[list[int]]:
    """1차원 좌표 리스트로부터 |거리| 대칭 행렬 생성."""
    return [[abs(a - b) for b in positions] for a in positions]


def test_empty_returns_empty() -> None:
    assert optimize_visit_order([], []) == []


def test_single_returns_same() -> None:
    assert optimize_visit_order(["a"], [[0]]) == ["a"]


def test_free_start_orders_collinear_points() -> None:
    # 위치 A=0 B=10 C=20 D=30 을 뒤섞어 입력
    ids = ["C", "A", "D", "B"]
    pos = [20, 0, 30, 10]
    m = _line_matrix(pos)
    order = optimize_visit_order(ids, m)
    # 시작 자유면 최적 개방 경로는 A,B,C,D 또는 그 역순
    assert order in (["A", "B", "C", "D"], ["D", "C", "B", "A"])
    idx = [ids.index(x) for x in order]
    assert path_duration(idx, m) == 30


def test_fixed_start_respected_and_optimal() -> None:
    ids = ["C", "A", "D", "B"]
    pos = [20, 0, 30, 10]
    m = _line_matrix(pos)
    order = optimize_visit_order(ids, m, start_index=0)  # C 에서 시작 고정
    assert order[0] == "C"
    assert order == ["C", "D", "B", "A"]  # C 시작 최소 개방 경로 = 40
    idx = [ids.index(x) for x in order]
    assert path_duration(idx, m) == 40


def test_matches_brute_force_for_small_n() -> None:
    # 비대칭 행렬에서도 정확해(Held-Karp)가 완전탐색과 일치해야 함
    m = [
        [0, 5, 9, 8, 7],
        [6, 0, 4, 11, 3],
        [10, 4, 0, 2, 6],
        [8, 12, 2, 0, 5],
        [7, 3, 6, 5, 0],
    ]
    n = len(m)
    order = optimize_visit_order([str(i) for i in range(n)], m)
    got = path_duration([int(x) for x in order], m)
    best = min(path_duration(list(p), m) for p in itertools.permutations(range(n)))
    assert got == best


def test_fixed_start_matches_brute_force() -> None:
    m = [
        [0, 5, 9, 8, 7],
        [6, 0, 4, 11, 3],
        [10, 4, 0, 2, 6],
        [8, 12, 2, 0, 5],
        [7, 3, 6, 5, 0],
    ]
    n = len(m)
    order = optimize_visit_order([str(i) for i in range(n)], m, start_index=2)
    assert order[0] == "2"
    got = path_duration([int(x) for x in order], m)
    best = min(
        path_duration([2, *p], m)
        for p in itertools.permutations([i for i in range(n) if i != 2])
    )
    assert got == best


def test_fixed_end_respected_and_optimal() -> None:
    ids = ["C", "A", "D", "B"]
    pos = [20, 0, 30, 10]
    m = _line_matrix(pos)
    order = optimize_visit_order(ids, m, end_index=2)  # D(30) 에서 종료 고정
    assert order[-1] == "D"
    n = len(ids)
    best = min(
        path_duration([*p, 2], m)
        for p in itertools.permutations([i for i in range(n) if i != 2])
    )
    assert path_duration([ids.index(x) for x in order], m) == best


def test_fixed_start_and_end_matches_brute_force() -> None:
    m = [
        [0, 5, 9, 8, 7],
        [6, 0, 4, 11, 3],
        [10, 4, 0, 2, 6],
        [8, 12, 2, 0, 5],
        [7, 3, 6, 5, 0],
    ]
    n = len(m)
    order = optimize_visit_order([str(i) for i in range(n)], m, start_index=2, end_index=0)
    assert order[0] == "2" and order[-1] == "0"
    got = path_duration([int(x) for x in order], m)
    mids = [i for i in range(n) if i not in (2, 0)]
    best = min(path_duration([2, *p, 0], m) for p in itertools.permutations(mids))
    assert got == best


def test_end_equal_start_is_ignored() -> None:
    # start==end(귀가 closed-tour)는 후속 슬라이스 → 종료 자유로 처리, start 만 고정한 결과와 동일
    ids = ["C", "A", "D", "B"]
    pos = [20, 0, 30, 10]
    m = _line_matrix(pos)
    order = optimize_visit_order(ids, m, start_index=0, end_index=0)
    assert order == ["C", "D", "B", "A"]


def test_large_n_fixed_end_respected() -> None:
    random.seed(7)
    n = 30  # 휴리스틱(NN + 2-opt) 경로
    pos = list(range(n))
    random.shuffle(pos)
    m = _line_matrix(pos)
    ids = [str(i) for i in range(n)]
    order = optimize_visit_order(ids, m, start_index=0, end_index=5)
    assert order[0] == "0" and order[-1] == "5"
    assert sorted(order) == sorted(ids)


def test_large_n_returns_valid_permutation_and_not_worse_than_identity() -> None:
    random.seed(42)
    n = 30  # Held-Karp 한계 초과 → 휴리스틱(NN + 2-opt) 경로
    pos = list(range(n))
    random.shuffle(pos)
    m = _line_matrix(pos)
    ids = [str(i) for i in range(n)]
    order = optimize_visit_order(ids, m)
    assert sorted(order) == sorted(ids)  # 모든 정점 1회씩 = 유효 순열
    got = path_duration([int(x) for x in order], m)
    identity = path_duration(list(range(n)), m)
    assert got <= identity  # 최소한 입력 순서보다 나빠지지 않음
