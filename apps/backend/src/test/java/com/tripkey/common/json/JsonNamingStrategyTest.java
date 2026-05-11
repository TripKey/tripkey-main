package com.tripkey.common.json;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.dto.dump.ParseJobStatusResponse;
import com.tripkey.dto.trip.TripCreateResponse;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
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
        ParseJobStatusResponse parseStatusResponse = new ParseJobStatusResponse(UUID.randomUUID(), "completed", (short) 3, "PARSE_FAILED");

        String tripJson = objectMapper.writeValueAsString(tripResponse);
        String statusJson = objectMapper.writeValueAsString(parseStatusResponse);

        assertThat(tripJson)
                .contains("trip_id")
                .contains("created_at")
                .doesNotContain("tripId")
                .doesNotContain("createdAt");

        assertThat(statusJson)
                .contains("job_id")
                .contains("error_code")
                .doesNotContain("jobId")
                .doesNotContain("errorCode");
    }

    @Test
    void serializesAiParseResponseFieldsAsSnakeCase() throws Exception {
        AiPlaceCardDto card = new AiPlaceCardDto(
                "place-1",
                "도톤보리",
                "food",
                "confirmed",
                "ready_partial",
                false,
                false,
                (short) 90,
                new AiPlaceCardDto.Coordinates(34.6687, 135.5013),
                "오사카 중앙구",
                "오사카부 오사카시 중앙구 도톤보리",
                "저녁 시간 추천",
                "현지 분위기 즐기기 좋아요",
                "오후에 혼잡할 수 있어요",
                null,
                List.of(),
                null,
                List.of("야경"),
                null,
                null,
                "KE723",
                "2026-07-01T08:30:00+09:00",
                "outbound"
        );

        AiParseResponse response = new AiParseResponse(
                List.of(card),
                "오사카 시내 중심 동선",
                List.of(new AiParseResponse.AlertCard(
                        "alert-1",
                        "timing_conflict",
                        "practical",
                        "trip",
                        null,
                        "이동 시간이 빠듯해요",
                        List.of(UUID.randomUUID())
                )),
                "3.2.0"
        );

        String json = objectMapper.writeValueAsString(response);

        assertThat(json)
                .contains("context_summary")
                .contains("alert_cards")
                .contains("parse_version")
                .contains("place_id")
                .contains("placement_status")
                .contains("is_ai_generated")
                .contains("allow_duplicate")
                .contains("estimated_duration_min")
                .contains("time_constraint")
                .contains("flight_number")
                .contains("flight_datetime")
                .contains("flight_role")
                .contains("user_context")
                .contains("blocked_reason")
                .contains("related_instance_ids")
                .doesNotContain("contextSummary")
                .doesNotContain("alertCards")
                .doesNotContain("parseVersion")
                .doesNotContain("placeId")
                .doesNotContain("placementStatus")
                .doesNotContain("isAiGenerated")
                .doesNotContain("allowDuplicate")
                .doesNotContain("estimatedDurationMin")
                .doesNotContain("timeConstraint")
                .doesNotContain("flightNumber")
                .doesNotContain("flightDatetime")
                .doesNotContain("flightRole")
                .doesNotContain("userContext")
                .doesNotContain("blockedReason")
                .doesNotContain("relatedInstanceIds");
    }
}
