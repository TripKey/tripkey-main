package com.tripkey.dto.trip;

import java.util.List;

public record DestinationSearchResponse(
        List<DestinationDto> results
) {
    public record DestinationDto(
            String name,
            String country,
            String placeId
    ) {
    }
}
