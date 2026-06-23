package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tripkey.domain.place.PlaceCard;

import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiCardParseRequest(
        @JsonProperty("trip_id")
        UUID tripId,

        List<String> destinations,

        @JsonProperty("travel_days")
        Short travelDays,

        @JsonProperty("companion_count")
        Short companionCount,

        @JsonProperty("natural_language_input")
        String naturalLanguageInput,

        CardSnapshot card
) {

    public static AiCardParseRequest from(
            PlaceCard card,
            List<String> destinations,
            Short travelDays,
            Short companionCount,
            String naturalLanguageInput
    ) {
        return new AiCardParseRequest(
                card.getTripId(),
                destinations,
                travelDays,
                companionCount,
                naturalLanguageInput,
                CardSnapshot.from(card)
        );
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record CardSnapshot(
            @JsonProperty("instance_id")
            UUID instanceId,

            String name,

            String category,

            String classification,

            @JsonProperty("placement_status")
            String placementStatus,

            @JsonProperty("estimated_duration_min")
            Short estimatedDurationMin,

            @JsonProperty("place_id")
            String placeId,

            AiNonBlockingEnrichmentRequest.Coordinates coordinates,

            String location,

            String address,

            @JsonProperty("time_constraint")
            String timeConstraint,

            @JsonProperty("question_text")
            String questionText,

            List<String> options,

            @JsonProperty("blocked_reason")
            String blockedReason,

            @JsonProperty("user_context")
            String userContext,

            String tips,

            List<String> tags,

            String source,

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
            String searchAlias
    ) {
        public static CardSnapshot from(PlaceCard card) {
            AiNonBlockingEnrichmentRequest.Coordinates coordinates =
                    (card.getLat() != null && card.getLng() != null)
                            ? new AiNonBlockingEnrichmentRequest.Coordinates(card.getLat(), card.getLng())
                            : null;

            return new CardSnapshot(
                    card.getInstanceId(),
                    card.getName(),
                    card.getCategory(),
                    card.getClassification(),
                    card.getPlacementStatus(),
                    card.getEstimatedDurationMin(),
                    card.getPlaceId(),
                    coordinates,
                    card.getLocation(),
                    card.getAddress(),
                    card.getTimeConstraint(),
                    card.getQuestionText(),
                    card.getOptions(),
                    card.getBlockedReason(),
                    card.getUserContext(),
                    card.getTips(),
                    card.getTags(),
                    card.getSource(),
                    card.getCheckIn(),
                    card.getCheckOut(),
                    card.getFlightNumber(),
                    card.getFlightDatetime(),
                    card.getFlightRole(),
                    card.getSearchAlias()
            );
        }
    }
}
