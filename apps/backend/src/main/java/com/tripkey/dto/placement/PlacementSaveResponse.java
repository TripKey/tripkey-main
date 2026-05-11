package com.tripkey.dto.placement;

import java.util.UUID;

public record PlacementSaveResponse(
        boolean saved,
        UUID tripId
) {
    public static PlacementSaveResponse of(UUID tripId) {
        return new PlacementSaveResponse(true, tripId);
    }
}
