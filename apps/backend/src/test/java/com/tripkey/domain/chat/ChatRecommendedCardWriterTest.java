package com.tripkey.domain.chat;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatRecommendedCardWriterTest {

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Test
    void correctsFieldsDropsInvalidCardsAndDeduplicatesWithinResponse() {
        UUID tripId = UUID.randomUUID();
        ChatRecommendedCardWriter writer = new ChatRecommendedCardWriter(placeCardRepository);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(placeCardRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        AiPlaceCardDto valid = card("place-1", 34.68, 135.52);
        AiPlaceCardDto duplicate = card("place-1", 34.68, 135.52);
        AiPlaceCardDto invalid = card("place-2", 91.0, 135.52);

        ChatCardWriteResult result = writer.saveRecommendedCards(tripId, List.of(valid, duplicate, invalid));

        assertThat(result.savedCards()).hasSize(1);
        PlaceCard saved = result.savedCards().getFirst();
        assertThat(saved.getClassification()).isEqualTo("open_question");
        assertThat(saved.getPlacementStatus()).isEqualTo("ready");
        assertThat(saved.getProcessingStatus()).isEqualTo("completed");
        assertThat(saved.getActionType()).isEqualTo("review_only");
        assertThat(saved.getSource()).isEqualTo("ai_recommend");
        assertThat(saved.getPendingReorder()).isTrue();
        assertThat(saved.getIsAiGenerated()).isTrue();
        assertThat(saved.getQuestionText()).isNull();
        assertThat(saved.getOptions()).isNull();
        assertThat(result.duplicates()).extracting("name").containsExactly("추천 장소");
    }

    @Test
    void filtersPlaceIdAlreadyPresentOnActiveCard() {
        UUID tripId = UUID.randomUUID();
        ChatRecommendedCardWriter writer = new ChatRecommendedCardWriter(placeCardRepository);
        PlaceCard existing = PlaceCard.createFromAiResponse(tripId, card("place-1", 34.68, 135.52), "ai_parse");
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(existing));

        ChatCardWriteResult result = writer.saveRecommendedCards(tripId, List.of(card("place-1", 34.68, 135.52)));

        assertThat(result.savedCards()).isEmpty();
        assertThat(result.duplicates()).hasSize(1);
        verify(placeCardRepository, never()).saveAll(anyList());
    }

    private static AiPlaceCardDto card(String placeId, Double lat, Double lng) {
        return new AiPlaceCardDto(
                placeId, "추천 장소", "place", "confirmed", "blocked", false, false,
                (short) 60, new AiPlaceCardDto.Coordinates(lat, lng), "오사카", "주소",
                null, "추천 근거", null, "잘못된 질문", List.of("잘못된 옵션"), null,
                List.of("실내"), null, null, null, null, null, null);
    }
}
