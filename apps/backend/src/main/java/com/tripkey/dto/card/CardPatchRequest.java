package com.tripkey.dto.card;

public record CardPatchRequest(
        Boolean allowDuplicate,
        String classification,
        Boolean isExcluded,
        String notes,
        String memo,
        String checkIn,
        String checkOut,
        String flightNumber,
        String location,
        String timeConstraint
) {
}
