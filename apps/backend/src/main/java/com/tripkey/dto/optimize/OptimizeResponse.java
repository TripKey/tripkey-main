package com.tripkey.dto.optimize;

import java.util.List;
import java.util.UUID;

/**
 * SCR-04 동선 최적화 1차 — Day별 "제안" 방문 순서 (#270).
 * 저장하지 않는 제안 결과. 사용자가 수락하면 verify/save 로 day_order 에 반영한다.
 */
public record OptimizeResponse(UUID tripId, List<DayOrder> days) {

    public record DayOrder(
            int day,
            List<UUID> orderedInstanceIds,
            int totalDurationSeconds,
            String source
    ) {}

    public static OptimizeResponse of(UUID tripId, List<DayOrder> days) {
        return new OptimizeResponse(tripId, days);
    }
}
