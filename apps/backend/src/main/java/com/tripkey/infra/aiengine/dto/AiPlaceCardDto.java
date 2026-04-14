package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiPlaceCardDto(
        @JsonProperty("place_id")
        String placeId,
        @JsonProperty("instance_id")
        String instanceId,
        String name,
        String category,
        String classification,
        @JsonProperty("estimated_duration_min")
        Short estimatedDurationMin,
        Coordinates coordinates,
        String status,
        @JsonProperty("time_constraint")
        String timeConstraint,
        @JsonProperty("conflict_type")
        String conflictType,
        @JsonProperty("conflict_reason")
        String conflictReason,
        List<String> remind
) {

    public record Coordinates(
            Double lat,
            Double lng
    ) {
    }
}
