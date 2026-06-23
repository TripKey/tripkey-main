package com.tripkey.dto.trip;

import java.time.OffsetDateTime;
import java.util.UUID;

public record TripCreateResponse(
        UUID tripId,
        OffsetDateTime createdAt
) {
}
