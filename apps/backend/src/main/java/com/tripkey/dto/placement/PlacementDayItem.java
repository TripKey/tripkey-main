package com.tripkey.dto.placement;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record PlacementDayItem(
        @NotNull
        UUID instanceId,

        @NotNull
        @Min(1)
        Integer order,

        Integer estimatedDurationMin
) {
}
