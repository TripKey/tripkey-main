package com.tripkey.dto.placement;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PlacementSaveRequest(
        @NotNull
        @Valid
        List<PlacementDay> days
) {
}
