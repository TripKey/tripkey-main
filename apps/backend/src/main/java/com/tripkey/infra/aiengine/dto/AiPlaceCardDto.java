package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiPlaceCardDto(
        @JsonProperty("place_id")
        String placeId,

        String name,

        String category,

        String classification,

        @JsonProperty("placement_status")
        String placementStatus,

        @JsonProperty("is_ai_generated")
        Boolean isAiGenerated,

        @JsonProperty("allow_duplicate")
        Boolean allowDuplicate,

        @JsonProperty("estimated_duration_min")
        Short estimatedDurationMin,

        Coordinates coordinates,

        String location,

        String address,

        @JsonProperty("time_constraint")
        String timeConstraint,

        @JsonProperty("user_context")
        String userContext,

        String tips,

        @JsonProperty("question_text")
        String questionText,

        List<String> options,

        @JsonProperty("blocked_reason")
        String blockedReason,

        List<String> tags,

        @JsonProperty("check_in")
        String checkIn,

        @JsonProperty("check_out")
        String checkOut,

        @JsonProperty("flight_number")
        String flightNumber
) {

    public record Coordinates(
            Double lat,
            Double lng
    ) {
    }
}
