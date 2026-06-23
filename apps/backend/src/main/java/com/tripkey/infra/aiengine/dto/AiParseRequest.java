package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AiParseRequest(
        @JsonProperty("trip_id")
        UUID tripId,

        @JsonProperty("dump_text")
        String dumpText,

        List<String> destinations,

        @JsonProperty("travel_days")
        Short travelDays,

        @JsonProperty("companion_count")
        Short companionCount,

        @JsonProperty("accommodation_inputs")
        List<AccommodationInput> accommodationInputs,

        @JsonProperty("departure_flight")
        FlightInput departureFlight,

        @JsonProperty("return_flight")
        FlightInput returnFlight
) {

    public AiParseRequest(
            UUID tripId,
            String dumpText,
            List<String> destinations,
            Short travelDays,
            Short companionCount
    ) {
        this(tripId, dumpText, destinations, travelDays, companionCount, null, null, null);
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record AccommodationInput(
            String name,
            String location,
            @JsonProperty("check_in") String checkIn,
            @JsonProperty("check_out") String checkOut
    ) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FlightInput(
            @JsonProperty("departure_airport") String departureAirport,
            @JsonProperty("arrival_airport") String arrivalAirport,
            @JsonProperty("flight_number") String flightNumber,
            String datetime
    ) {
    }
}
