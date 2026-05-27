package com.tripkey.dto.dump;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DumpSubmitRequest(
        @NotBlank
        @Size(min = 10, max = 3000, message = "10자 이상 3000자 이하로 입력해주세요")
        String dumpText,

        @JsonProperty("departure_flight")
        FlightInput departureFlight,

        @JsonProperty("return_flight")
        FlightInput returnFlight
) {

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record FlightInput(
            @JsonProperty("departure_airport") String departureAirport,
            @JsonProperty("arrival_airport") String arrivalAirport,
            @JsonProperty("flight_number") String flightNumber,
            String datetime
    ) {
    }
}
