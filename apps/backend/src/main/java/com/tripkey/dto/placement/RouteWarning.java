package com.tripkey.dto.placement;

import java.util.List;
import java.util.UUID;

public record RouteWarning(
        String type,
        Integer day,
        List<UUID> instanceIds,
        String message,
        Integer distanceMeters,
        Integer totalMinutes
) {
    public static RouteWarning distance(int day, UUID a, UUID b, int distanceMeters) {
        double km = distanceMeters / 1000.0;
        return new RouteWarning(
                "distance",
                day,
                List.of(a, b),
                String.format("인접 카드 간 거리 %.1fkm", km),
                distanceMeters,
                null
        );
    }

    public static RouteWarning duration(int day, List<UUID> instanceIds, int totalMinutes) {
        int hours = totalMinutes / 60;
        return new RouteWarning(
                "duration",
                day,
                instanceIds,
                String.format("Day %d 활동 시간 합계 %d시간", day, hours),
                null,
                totalMinutes
        );
    }
}
