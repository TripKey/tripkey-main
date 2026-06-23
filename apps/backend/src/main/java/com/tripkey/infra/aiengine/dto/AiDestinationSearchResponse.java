package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiDestinationSearchResponse(
        List<Destination> results
) {
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Destination(
            String name,
            String country,
            @JsonProperty("place_id") String placeId
    ) {
    }
}
