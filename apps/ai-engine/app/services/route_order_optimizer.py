"""SCR-04 동선 최적화 1차 — Day 내 방문 순서 최적화기 (#270).

이동시간 행렬(matrix[i][j] = i→j 이동 초)을 받아 총 이동시간이 최소가 되는
**개방 경로**(open path: 출발지로 되돌아오지 않음) 방문 순서를 반환한다.

- n <= HELD_KARP_MAX: Held-Karp DP 로 정확해(asymmetric 행렬도 정확).
- 그 이상: nearest-neighbor + 2-opt 휴리스틱(full-recompute 라 asymmetric 안전).

순수 함수 — 외부 I/O 없음. 행렬 산출(Routes API)은 호출 측 책임.
"""

from __future__ import annotations

# Held-Karp 는 O(n^2 * 2^n). n=13 이면 약 13^2 * 8192 ≈ 1.4M 연산으로 충분히 빠르다.
# 하루 방문 카드가 13개를 넘는 경우는 드물어, 정확해 범위가 사실상 대부분을 커버한다.
HELD_KARP_MAX = 13


def path_duration(order: list[int], matrix: list[list[int]]) -> int:
    """개방 경로의 총 이동시간(연속 구간 합)."""
    return sum(matrix[order[i]][order[i + 1]] for i in range(len(order) - 1))


def optimize_visit_order(
    instance_ids: list[str],
    matrix: list[list[int]],
    start_index: int | None = None,
) -> list[str]:
    """instance_id 리스트를 총 이동시간 최소 순서로 재배열해 반환."""
    if len(instance_ids) <= 1:
        return list(instance_ids)
    order = solve_open_path(matrix, start_index)
    return [instance_ids[i] for i in order]


def solve_open_path(matrix: list[list[int]], start: int | None = None) -> list[int]:
    """최소 비용 개방 경로의 인덱스 순서. start 지정 시 그 인덱스에서 시작 고정."""
    n = len(matrix)
    if n <= 1:
        return list(range(n))
    if n <= HELD_KARP_MAX:
        return _held_karp_open_path(matrix, start)
    return _nearest_neighbor_2opt(matrix, start)


def _held_karp_open_path(matrix: list[list[int]], start: int | None) -> list[int]:
    n = len(matrix)
    inf = float("inf")
    full = (1 << n) - 1

    # dp[mask][i] = mask 의 정점을 정확히 한 번씩 방문하고 i 에서 끝나는 최소 비용
    dp = [[inf] * n for _ in range(1 << n)]
    parent = [[-1] * n for _ in range(1 << n)]

    bases = [start] if start is not None else range(n)
    for s in bases:
        dp[1 << s][s] = 0

    for mask in range(1 << n):
        for i in range(n):
            cost_i = dp[mask][i]
            if cost_i == inf or not (mask & (1 << i)):
                continue
            for j in range(n):
                if mask & (1 << j):
                    continue
                nmask = mask | (1 << j)
                cost = cost_i + matrix[i][j]
                if cost < dp[nmask][j]:
                    dp[nmask][j] = cost
                    parent[nmask][j] = i

    best_end, best_cost = 0, inf
    for i in range(n):
        if dp[full][i] < best_cost:
            best_cost, best_end = dp[full][i], i

    order: list[int] = []
    mask, cur = full, best_end
    while cur != -1:
        order.append(cur)
        prev = parent[mask][cur]
        mask ^= 1 << cur
        cur = prev
    order.reverse()
    return order


def _nearest_neighbor_2opt(matrix: list[list[int]], start: int | None) -> list[int]:
    n = len(matrix)
    s = 0 if start is None else start

    # 1) nearest-neighbor 초기 경로
    visited = [False] * n
    order = [s]
    visited[s] = True
    cur = s
    for _ in range(n - 1):
        nxt = min(
            (j for j in range(n) if not visited[j]),
            key=lambda j: matrix[cur][j],
        )
        order.append(nxt)
        visited[nxt] = True
        cur = nxt

    # 2) 2-opt 개선 (full-recompute → asymmetric 행렬에서도 안전)
    fix_start = start is not None
    lo = 1 if fix_start else 0
    best = path_duration(order, matrix)
    improved = True
    while improved:
        improved = False
        for i in range(lo, n - 1):
            for k in range(i + 1, n):
                cand = order[:i] + order[i : k + 1][::-1] + order[k + 1 :]
                d = path_duration(cand, matrix)
                if d + 1e-9 < best:
                    order, best = cand, d
                    improved = True
    return order
