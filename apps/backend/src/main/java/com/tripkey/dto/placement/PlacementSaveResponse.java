package com.tripkey.dto.placement;

import java.util.List;
import java.util.UUID;

public record PlacementSaveResponse(
        boolean saved,
        UUID tripId,
        List<UUID> skippedInstanceIds,
        List<RouteWarning> routeWarnings
) {
    public static PlacementSaveResponse of(UUID tripId, List<UUID> skippedInstanceIds, List<RouteWarning> routeWarnings) {
        return new PlacementSaveResponse(true, tripId, skippedInstanceIds, routeWarnings);
    }

    public static PlacementSaveResponse of(UUID tripId, List<UUID> skippedInstanceIds) {
        return of(tripId, skippedInstanceIds, List.of());
    }

    public static PlacementSaveResponse of(UUID tripId) {
        return of(tripId, List.of(), List.of());
    }
}
