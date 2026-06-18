package com.tripkey.dto.card;

import com.tripkey.domain.place.PlaceCard;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class CardDtoTest {

    private static PlaceCard sampleCard() {
        return PlaceCard.createUserCard(
                UUID.randomUUID(), "도톤보리", "place", null, null, null, null, null, null, null);
    }

    @Test
    void fromLeavesScheduledTimeNull() {
        assertThat(CardDto.from(sampleCard()).scheduledTime()).isNull();
    }

    @Test
    void withScheduledTimeReturnsCopyWithTimePreservingOtherFields() {
        CardDto dto = CardDto.from(sampleCard()).withScheduledTime("09:00");

        assertThat(dto.scheduledTime()).isEqualTo("09:00");
        assertThat(dto.name()).isEqualTo("도톤보리");
        assertThat(dto.category()).isEqualTo("place");
    }
}
