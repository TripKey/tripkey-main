package com.tripkey.controller;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/test/ai")
public class AiTestController {

    private static final String AI_PARSE_URL = "http://tripkey-ai-engine:8000/internal/ai/parse";

    private final RestTemplate restTemplate = new RestTemplate();

    @GetMapping("/parse/example")
    public AiParseTestRequest example() {
        return defaultExample();
    }

    @PostMapping("/parse")
    public Object test(@RequestBody(required = false) AiParseTestRequest body) {
        AiParseTestRequest payload = body != null ? body : defaultExample();
        return restTemplate.postForObject(AI_PARSE_URL, payload, Object.class);
    }

    private AiParseTestRequest defaultExample() {
        return new AiParseTestRequest(
                UUID.randomUUID().toString(),
                """
                도쿄 3박4일 여행이야.
                첫날엔 도쿄타워 꼭 가고 싶고, 시부야 스카이도 고민 중이야.
                맛집은 스시 한 군데 가고 싶고 카페도 있으면 좋겠어.
                숙소는 신주쿠 근처로 잡았어.
                """,
                List.of("도쿄"),
                (short) 4,
                (short) 2,
                List.of(
                        new AccommodationInput(
                                "호텔 그레이서리 신주쿠",
                                "신주쿠",
                                "2026-05-01",
                                "2026-05-04"
                        )
                ),
                null,
                null
        );
    }

    public record AiParseTestRequest(
            @JsonProperty("trip_id")
            String tripId,
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
    }

    public record AccommodationInput(
            String name,
            String location,
            @JsonProperty("check_in")
            String checkIn,
            @JsonProperty("check_out")
            String checkOut
    ) {
    }

    public record FlightInput(
            @JsonProperty("departure_airport")
            String departureAirport,
            @JsonProperty("arrival_airport")
            String arrivalAirport,
            @JsonProperty("flight_number")
            String flightNumber,
            String datetime
    ) {
    }
}
