package com.tripkey.domain.alert;

import com.tripkey.infra.aiengine.dto.AiParseResponse;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AlertCardTest {

    @Test
    void fromAiResponseCopiesFields() {
        UUID tripId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        UUID related = UUID.randomUUID();

        AlertCard card = AlertCard.fromAiResponse(
                new AiParseResponse.AlertCard(
                        "alert-1",
                        "timing_conflict",
                        "practical",
                        "trip",
                        null,
                        "체크인이 항공편보다 빨라요",
                        List.of(related)
                ),
                tripId,
                jobId
        );

        assertThat(card.getTripId()).isEqualTo(tripId);
        assertThat(card.getJobId()).isEqualTo(jobId);
        assertThat(card.getAlertId()).isEqualTo("alert-1");
        assertThat(card.getType()).isEqualTo("timing_conflict");
        assertThat(card.getCategory()).isEqualTo("practical");
        assertThat(card.getScope()).isEqualTo("trip");
        assertThat(card.getDay()).isNull();
        assertThat(card.getMessage()).isEqualTo("체크인이 항공편보다 빨라요");
        assertThat(card.relatedInstanceUuids()).containsExactly(related);
    }

    @Test
    void fromAiResponseDefaultsScopeToTripWhenNull() {
        UUID tripId = UUID.randomUUID();
        AlertCard card = AlertCard.fromAiResponse(
                new AiParseResponse.AlertCard("a", "t", "practical", null, null, "m", null),
                tripId,
                null
        );
        assertThat(card.getScope()).isEqualTo("trip");
        assertThat(card.getJobId()).isNull();
    }

    @Test
    void fromAiResponseConvertsDayIntegerToShort() {
        UUID tripId = UUID.randomUUID();
        AlertCard card = AlertCard.fromAiResponse(
                new AiParseResponse.AlertCard("a", "t", "insight", "day", 3, "m", null),
                tripId,
                null
        );
        assertThat(card.getDay()).isEqualTo((short) 3);
    }

    @Test
    void relatedInstanceUuidsReturnsEmptyListWhenNull() {
        UUID tripId = UUID.randomUUID();
        AlertCard card = AlertCard.fromAiResponse(
                new AiParseResponse.AlertCard("a", "t", "practical", "trip", null, "m", null),
                tripId,
                null
        );
        assertThat(card.relatedInstanceUuids()).isEmpty();
    }
}
