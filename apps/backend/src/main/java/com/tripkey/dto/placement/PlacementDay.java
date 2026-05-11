package com.tripkey.dto.placement;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PlacementDay(
        @NotNull
        @Min(1)
        Integer dayNumber,

        @NotNull
        @Valid
        List<PlacementDayItem> cards
) {
}
