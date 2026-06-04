package com.tripkey.dto.placement;

import java.util.List;
import java.util.UUID;

public record PlacementSaveResponse(
        boolean saved,
        UUID tripId,
        List<UUID> skippedInstanceIds,
        List<RouteWarning> routeWarnings,
        List<RouteLeg> routeLegs
) {
    public static PlacementSaveResponse of(UUID tripId, List<UUID> skippedInstanceIds,
                                           List<RouteWarning> routeWarnings, List<RouteLeg> routeLegs) {
        return new PlacementSaveResponse(true, tripId, skippedInstanceIds, routeWarnings, routeLegs);
    }

    public static PlacementSaveResponse of(UUID tripId, List<UUID> skippedInstanceIds,
                                           List<RouteWarning> routeWarnings) {
        return of(tripId, skippedInstanceIds, routeWarnings, List.of());
    }

    public static PlacementSaveResponse of(UUID tripId, List<UUID> skippedInstanceIds) {
        return of(tripId, skippedInstanceIds, List.of(), List.of());
    }

    public static PlacementSaveResponse of(UUID tripId) {
        return of(tripId, List.of(), List.of(), List.of());
    }
}
