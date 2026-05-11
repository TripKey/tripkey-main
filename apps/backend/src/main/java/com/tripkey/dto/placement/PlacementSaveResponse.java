package com.tripkey.dto.placement;

import java.util.List;
import java.util.UUID;

public record PlacementSaveResponse(
        boolean saved,
        UUID tripId,
        List<UUID> skippedInstanceIds
) {
    public static PlacementSaveResponse of(UUID tripId, List<UUID> skippedInstanceIds) {
        return new PlacementSaveResponse(true, tripId, skippedInstanceIds);
    }

    public static PlacementSaveResponse of(UUID tripId) {
        return of(tripId, List.of());
    }
}
