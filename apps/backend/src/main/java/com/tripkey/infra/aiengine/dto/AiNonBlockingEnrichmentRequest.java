package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tripkey.domain.place.PlaceCard;

import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiNonBlockingEnrichmentRequest(
        @JsonProperty("trip_id")
        UUID tripId,

        List<String> destinations,

        @JsonProperty("travel_days")
        Short travelDays,

        @JsonProperty("companion_count")
        Short companionCount,

        CardSnapshot card
) {

    public static AiNonBlockingEnrichmentRequest from(
            PlaceCard card,
            List<String> destinations,
            Short travelDays,
            Short companionCount
    ) {
        return new AiNonBlockingEnrichmentRequest(
                card.getTripId(),
                destinations,
                travelDays,
                companionCount,
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

            Coordinates coordinates,

            String location,

            String address,

            @JsonProperty("time_constraint")
            String timeConstraint,

            @JsonProperty("user_context")
            String userContext,

            String tips,

            List<String> tags,

            @JsonProperty("check_in")
            String checkIn,

            @JsonProperty("check_out")
            String checkOut,

            // TODO[#flight-fields]: Add flight_datetime and flight_role after the BE flight schema/DTO change lands.
            @JsonProperty("flight_number")
            String flightNumber
    ) {
        public static CardSnapshot from(PlaceCard card) {
            Coordinates coordinates = (card.getLat() != null && card.getLng() != null)
                    ? new Coordinates(card.getLat(), card.getLng())
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
                    card.getUserContext(),
                    card.getTips(),
                    card.getTags(),
                    card.getCheckIn(),
                    card.getCheckOut(),
                    card.getFlightNumber()
            );
        }
    }

    public record Coordinates(
            Double lat,
            Double lng
    ) {
    }
}
