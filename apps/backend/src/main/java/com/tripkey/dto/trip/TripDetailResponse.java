package com.tripkey.dto.trip;

import com.tripkey.domain.trip.Trip;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record TripDetailResponse(
        UUID tripId,
        Short travelDays,
        Short companionCount,
        List<String> destinations,
        boolean confirmed,
        OffsetDateTime createdAt
) {
    public static TripDetailResponse of(Trip trip, List<String> destinations) {
        return new TripDetailResponse(
                trip.getTripId(),
                trip.getTravelDays(),
                trip.getCompanionCount(),
                destinations,
                trip.getConfirmedAt() != null,
                trip.getCreatedAt()
        );
    }
}
