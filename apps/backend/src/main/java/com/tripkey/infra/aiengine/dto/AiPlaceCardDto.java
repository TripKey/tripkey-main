package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
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
        String flightNumber,

        @JsonProperty("flight_datetime")
        String flightDatetime,

        @JsonProperty("flight_role")
        String flightRole,

        @JsonProperty("search_alias")
        String searchAlias,

        // 영업시간 {요일(0=일~6=토): [["HH:MM","HH:MM"],...]} — jsonb 저장용 (#292)
        @JsonProperty("opening_hours")
        JsonNode openingHours
) {

    // 하위호환: opening_hours 도입(#292) 이전 시그니처
    public AiPlaceCardDto(
            String placeId,
            String name,
            String category,
            String classification,
            String placementStatus,
            Boolean isAiGenerated,
            Boolean allowDuplicate,
            Short estimatedDurationMin,
            Coordinates coordinates,
            String location,
            String address,
            String timeConstraint,
            String userContext,
            String tips,
            String questionText,
            List<String> options,
            String blockedReason,
            List<String> tags,
            String checkIn,
            String checkOut,
            String flightNumber,
            String flightDatetime,
            String flightRole,
            String searchAlias
    ) {
        this(
                placeId,
                name,
                category,
                classification,
                placementStatus,
                isAiGenerated,
                allowDuplicate,
                estimatedDurationMin,
                coordinates,
                location,
                address,
                timeConstraint,
                userContext,
                tips,
                questionText,
                options,
                blockedReason,
                tags,
                checkIn,
                checkOut,
                flightNumber,
                flightDatetime,
                flightRole,
                searchAlias,
                null
        );
    }

    public AiPlaceCardDto(
            String placeId,
            String name,
            String category,
            String classification,
            String placementStatus,
            Boolean isAiGenerated,
            Boolean allowDuplicate,
            Short estimatedDurationMin,
            Coordinates coordinates,
            String location,
            String address,
            String timeConstraint,
            String userContext,
            String tips,
            String questionText,
            List<String> options,
            String blockedReason,
            List<String> tags,
            String checkIn,
            String checkOut,
            String flightNumber,
            String flightDatetime,
            String flightRole
    ) {
        this(
                placeId,
                name,
                category,
                classification,
                placementStatus,
                isAiGenerated,
                allowDuplicate,
                estimatedDurationMin,
                coordinates,
                location,
                address,
                timeConstraint,
                userContext,
                tips,
                questionText,
                options,
                blockedReason,
                tags,
                checkIn,
                checkOut,
                flightNumber,
                flightDatetime,
                flightRole,
                null,
                null
        );
    }

    public AiPlaceCardDto(
            String placeId,
            String name,
            String category,
            String classification,
            String placementStatus,
            Boolean isAiGenerated,
            Boolean allowDuplicate,
            Short estimatedDurationMin,
            Coordinates coordinates,
            String location,
            String address,
            String timeConstraint,
            String userContext,
            String tips,
            String questionText,
            List<String> options,
            String blockedReason,
            List<String> tags,
            String checkIn,
            String checkOut,
            String flightNumber
    ) {
        this(
                placeId,
                name,
                category,
                classification,
                placementStatus,
                isAiGenerated,
                allowDuplicate,
                estimatedDurationMin,
                coordinates,
                location,
                address,
                timeConstraint,
                userContext,
                tips,
                questionText,
                options,
                blockedReason,
                tags,
                checkIn,
                checkOut,
                flightNumber,
                null,
                null,
                null,
                null
        );
    }

    public record Coordinates(
            Double lat,
            Double lng
    ) {
    }
}
