package com.tripkey.common.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.dto.dump.DumpResultResponse;
import com.tripkey.dto.dump.DumpStatusResponse;
import com.tripkey.dto.trip.TripCreateResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@JsonTest
class JsonNamingStrategyTest {

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void serializesTopLevelResponseFieldsAsSnakeCase() throws Exception {
        TripCreateResponse tripResponse = new TripCreateResponse(UUID.randomUUID(), OffsetDateTime.parse("2026-04-13T12:00:00Z"));
        DumpStatusResponse dumpStatusResponse = new DumpStatusResponse(UUID.randomUUID(), "completed", (short) 3, "PARSE_FAILED");

        String tripJson = objectMapper.writeValueAsString(tripResponse);
        String dumpStatusJson = objectMapper.writeValueAsString(dumpStatusResponse);

        assertThat(tripJson)
                .contains("trip_id")
                .contains("created_at")
                .doesNotContain("tripId")
                .doesNotContain("createdAt");

        assertThat(dumpStatusJson)
                .contains("job_id")
                .contains("error_code")
                .doesNotContain("jobId")
                .doesNotContain("errorCode");
    }

    @Test
    void serializesNestedResponseFieldsAsSnakeCase() throws Exception {
        DumpResultResponse response = new DumpResultResponse(
                List.of(
                        new DumpResultResponse.PlaceCardDto(
                                UUID.randomUUID(),
                                "place-1",
                                "success",
                                "Dotonbori",
                                "tour",
                                "confirmed",
                                (short) 90,
                                "night_only",
                                true,
                                "duplicate",
                                "already added",
                                List.of("visit at night"),
                                new DumpResultResponse.CoordinatesDto(34.6687, 135.5013)
                        )
                ),
                "Osaka city route",
                List.of(
                        new DumpResultResponse.AlertCardDto(
                                "warning",
                                "Review this card",
                                List.of(UUID.randomUUID())
                        )
                )
        );

        String json = objectMapper.writeValueAsString(response);

        assertThat(json)
                .contains("context_summary")
                .contains("alert_cards")
                .contains("instance_id")
                .contains("place_id")
                .contains("estimated_duration_min")
                .contains("time_constraint")
                .contains("is_ai_generated")
                .contains("conflict_type")
                .contains("conflict_reason")
                .contains("related_instance_ids")
                .doesNotContain("contextSummary")
                .doesNotContain("alertCards")
                .doesNotContain("instanceId")
                .doesNotContain("placeId")
                .doesNotContain("estimatedDurationMin")
                .doesNotContain("timeConstraint")
                .doesNotContain("isAiGenerated")
                .doesNotContain("conflictType")
                .doesNotContain("conflictReason")
                .doesNotContain("relatedInstanceIds");
    }
}
