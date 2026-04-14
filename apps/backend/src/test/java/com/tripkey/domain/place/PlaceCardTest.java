package com.tripkey.domain.place;

import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceCardTest {

    @Test
    void createFromAiResponseNormalizesCategoryAndConflictType() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "place-1",
                null,
                "Dotonbori",
                "restaurant",
                "confirmed",
                (short) 90,
                null,
                "success",
                null,
                "duplicate",
                null,
                List.of("visit at night")
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto);

        assertThat(card.getCategory()).isEqualTo("식사");
        assertThat(card.getConflictType()).isEqualTo("choice_conflict");
        assertThat(card.getPlaceId()).isEqualTo("place-1");
    }

    @Test
    void createFromAiResponseFallsBackForUnknownCategoryAndConflictType() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "place-2",
                null,
                "Unknown Spot",
                "museum",
                "confirmed",
                (short) 60,
                null,
                "success",
                null,
                "something_else",
                null,
                List.of()
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto);

        assertThat(card.getCategory()).isEqualTo("미분류");
        assertThat(card.getConflictType()).isNull();
    }

    @Test
    void createFromAiResponseGeneratesFallbackPlaceIdWhenMissing() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "   ",
                null,
                "No Place Id",
                "tour",
                "confirmed",
                (short) 60,
                null,
                "success",
                null,
                null,
                null,
                List.of()
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto);

        assertThat(card.getPlaceId()).startsWith("unknown:");
    }
}
