package com.tripkey.domain.place;

import com.tripkey.dto.card.CardDto;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PlaceCardTest {

    @Test
    void createFromAiResponseFillsBackendManagedFields() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "place-1",
                "도톤보리",
                "food",
                "confirmed",
                "ready_partial",
                false,
                false,
                (short) 90,
                new AiPlaceCardDto.Coordinates(34.6687, 135.5031),
                "오사카 중앙구",
                null,
                null,
                "야간 방문 추천",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getCategory()).isEqualTo("food");
        assertThat(card.getClassification()).isEqualTo("confirmed");
        assertThat(card.getPlacementStatus()).isEqualTo("ready_partial");
        assertThat(card.getProcessingStatus()).isEqualTo("pending");
        assertThat(card.getActionType()).isEqualTo("review_only");
        assertThat(card.getCanExclude()).isTrue();
        assertThat(card.getAllowDuplicate()).isFalse();
        assertThat(card.getIsExcluded()).isFalse();
        assertThat(card.getIsAiGenerated()).isFalse();
        assertThat(card.getSource()).isEqualTo("ai_parse");
    }

    @Test
    void createFromAiResponseAppliesCategoryFallbacksAndDefaults() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null,
                "친구집",
                "관광",
                "undecided",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "친구집 주소를 알려주세요",
                null,
                null,
                null,
                null,
                null,
                null,
                null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getCategory()).isEqualTo("place");
        assertThat(card.getClassification()).isEqualTo("undecided");
        assertThat(card.getPlacementStatus()).isEqualTo("needs_input");
        assertThat(card.getActionType()).isEqualTo("input_required");
        assertThat(card.getAllowDuplicate()).isFalse();
        assertThat(card.getCanExclude()).isTrue();
        assertThat(card.getPlaceId()).isNull();
    }

    @Test
    void createFromAiResponseDerivesSelectRequiredWhenOptionsPresent() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null,                                    // place_id
                "스시 식당",                              // name
                "food",                                  // category
                "undecided",                             // classification
                "ready_partial",                         // placement_status
                false,                                   // is_ai_generated
                null,                                    // allow_duplicate
                null,                                    // estimated_duration_min
                null,                                    // coordinates
                null,                                    // location
                null,                                    // address
                null,                                    // time_constraint
                null,                                    // user_context
                null,                                    // tips
                "어떤 종류의 스시 레스토랑을 원하세요?",    // question_text
                List.of("라멘", "스시", "야키토리"),       // options
                null,                                    // blocked_reason
                null,                                    // tags
                null,                                    // check_in
                null,                                    // check_out
                null                                     // flight_number
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getActionType()).isEqualTo("select_required");
        assertThat(card.getOptions()).containsExactly("라멘", "스시", "야키토리");
    }

    @Test
    void createFromAiResponseFlagsBlockedAsFixRequired() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null,                                       // place_id
                "알 수 없음",                                // name
                "etc",                                      // category
                "unassigned",                               // classification
                "blocked",                                  // placement_status
                false,                                      // is_ai_generated
                null,                                       // allow_duplicate
                null,                                       // estimated_duration_min
                null,                                       // coordinates
                null,                                       // location
                null,                                       // address
                null,                                       // time_constraint
                null,                                       // user_context
                null,                                       // tips
                null,                                       // question_text
                null,                                       // options
                "구체적인 장소를 특정할 수 없어요",          // blocked_reason
                null,                                       // tags
                null,                                       // check_in
                null,                                       // check_out
                null                                        // flight_number
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getPlacementStatus()).isEqualTo("blocked");
        assertThat(card.getActionType()).isEqualTo("fix_required");
        assertThat(card.getBlockedReason()).isEqualTo("구체적인 장소를 특정할 수 없어요");
    }

    @Test
    void createFromAiResponseSetsTransportDefaults() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null,
                "김포-오사카 항공편",
                "transport",
                "confirmed",
                "ready",
                false,
                true,
                null,
                null,
                null,
                null,
                "08:30 출발",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "KE723",
                "2026-07-01T08:30:00+09:00",
                "outbound"
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getCategory()).isEqualTo("transport");
        assertThat(card.getCanExclude()).isFalse();
        assertThat(card.getAllowDuplicate()).isTrue();
        assertThat(card.getFlightNumber()).isEqualTo("KE723");
        assertThat(card.getFlightDatetime()).isEqualTo("2026-07-01T08:30:00+09:00");
        assertThat(card.getFlightRole()).isEqualTo("outbound");

        CardDto cardDto = CardDto.from(card);
        assertThat(cardDto.flightNumber()).isEqualTo("KE723");
        assertThat(cardDto.flightDatetime()).isEqualTo("2026-07-01T08:30:00+09:00");
        assertThat(cardDto.flightRole()).isEqualTo("outbound");
    }

    @Test
    void createFromAiResponseNullsInvalidFlightRole() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null,
                "김포-오사카 항공편",
                "transport",
                "confirmed",
                "ready",
                false,
                true,
                null,
                null,
                null,
                null,
                "08:30 출발",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "KE723",
                "2026-07-01T08:30:00+09:00",
                "middle"
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getFlightDatetime()).isEqualTo("2026-07-01T08:30:00+09:00");
        assertThat(card.getFlightRole()).isNull();
    }

    @Test
    void createFromAiResponseNullsNonIsoFlightDatetime() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null,
                "김포-오사카 항공편",
                "transport",
                "confirmed",
                "ready",
                false,
                true,
                null,
                null,
                null,
                null,
                "08:30 출발",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "KE723",
                "7월 1일 오전 8시 30분",
                "outbound"
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getFlightDatetime()).isNull();
        assertThat(card.getFlightRole()).isEqualTo("outbound");
    }

    @Test
    void createFromAiResponseWithAiParseSourceMarksPendingReorderFalse() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "place-1",
                "도톤보리",
                "food",
                "confirmed",
                "ready_partial",
                false,
                false,
                (short) 90,
                null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getSource()).isEqualTo("ai_parse");
        assertThat(card.getPendingReorder())
                .as("ai_parse 카드는 즉시 클러스터에 합류해야 하므로 false")
                .isFalse();
    }

    @Test
    void createFromAiResponseWithAiRecommendSourceMarksPendingReorderTrue() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "place-1",
                "도톤보리",
                "food",
                "confirmed",
                "ready_partial",
                false,
                false,
                (short) 90,
                null, null, null, null, null, null, null, null, null, null, null, null, null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_recommend");

        assertThat(card.getSource()).isEqualTo("ai_recommend");
        assertThat(card.getPendingReorder())
                .as("ai_recommend 카드는 사용자가 인지하도록 pending_reorder=true 로 분류")
                .isTrue();
    }

    @Test
    void createFromAiResponseEnqueuesAsPending() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "p1", "도톤보리", "place", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카",
                null, null, null, null, null, null, null, null, null, null, null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getProcessingStatus()).isEqualTo("pending");
    }

    @Test
    void markProcessingSetsProcessingStatus() {
        PlaceCard card = sampleCard();
        card.markProcessing();
        assertThat(card.getProcessingStatus()).isEqualTo("processing");
    }

    @Test
    void completeEnrichmentMarksCompleted() {
        PlaceCard card = sampleCard();
        card.markProcessing();
        card.completeEnrichment();
        assertThat(card.getProcessingStatus()).isEqualTo("completed");
    }

    @Test
    void markFailedSetsFailed() {
        PlaceCard card = sampleCard();
        card.markProcessing();
        card.markFailed();
        assertThat(card.getProcessingStatus()).isEqualTo("failed");
    }

    @Test
    void createFromAiResponseDemotesConfirmedWithoutCoordinates() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "place-1", "모호한 장소", "food", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카",
                null, null, null, null, null, null, null, null, null, null, null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getClassification()).isEqualTo("undecided");
        assertThat(card.getPlacementStatus()).isEqualTo("needs_input");
        assertThat(card.getActionType()).isEqualTo("input_required");
    }

    @Test
    void createFromAiResponseKeepsConfirmedWhenCoordinatesPresent() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "place-1", "도톤보리", "food", "confirmed", "ready_partial",
                false, false, (short) 90,
                new AiPlaceCardDto.Coordinates(34.6687, 135.5031), "오사카",
                null, null, null, null, null, null, null, null, null, null, null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getClassification()).isEqualTo("confirmed");
        assertThat(card.getPlacementStatus()).isEqualTo("ready_partial");
        assertThat(card.getActionType()).isEqualTo("review_only");
        assertThat(card.getLat()).isEqualTo(34.6687);
        assertThat(card.getLng()).isEqualTo(135.5031);
    }

    @Test
    void createFromAiResponseExemptsTransportWithoutCoordinates() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null, "김포-오사카 항공편", "transport", "confirmed", "ready",
                false, true, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getClassification()).isEqualTo("confirmed");
        assertThat(card.getActionType()).isEqualTo("review_only");
    }

    @Test
    void createFromAiResponseDoesNotDemoteOpenQuestionWithoutCoordinates() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null, "오사카 어디?", "place", "open_question", "ready_partial",
                false, false, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getClassification()).isEqualTo("open_question");
    }

    @Test
    void applyCardLevelParseResultDemotesWhenCoordinatesMissing() {
        PlaceCard card = sampleCard();
        AiPlaceCardDto parsed = new AiPlaceCardDto(
                "place-1", "모호한 장소", "food", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카",
                null, null, null, null, null, null, null, null, null, null, null
        );

        card.applyCardLevelParseResult(parsed);

        assertThat(card.getClassification()).isEqualTo("undecided");
        assertThat(card.getPlacementStatus()).isEqualTo("needs_input");
        assertThat(card.getActionType()).isEqualTo("input_required");
    }

    @Test
    void applyCardLevelParseResultKeepsConfirmedWhenCoordinatesPresent() {
        PlaceCard card = sampleCard();
        AiPlaceCardDto parsed = new AiPlaceCardDto(
                "place-1", "도톤보리", "food", "confirmed", "ready_partial",
                false, false, (short) 90,
                new AiPlaceCardDto.Coordinates(34.6687, 135.5031), "오사카",
                null, null, null, null, null, null, null, null, null, null, null
        );

        card.applyCardLevelParseResult(parsed);

        assertThat(card.getClassification()).isEqualTo("confirmed");
        assertThat(card.getPlacementStatus()).isEqualTo("ready_partial");
        assertThat(card.getProcessingStatus()).isEqualTo("completed");
        assertThat(card.getLat()).isEqualTo(34.6687);
        assertThat(card.getLng()).isEqualTo(135.5031);
    }

    @Test
    void applyCardLevelParseResultExemptsTransport() {
        PlaceCard card = sampleCard();
        AiPlaceCardDto parsed = new AiPlaceCardDto(
                null, "김포-오사카 항공편", "transport", "confirmed", "ready",
                false, true, null, null, null,
                null, null, null, null, null, null, null, null, null, null, null
        );

        card.applyCardLevelParseResult(parsed);

        assertThat(card.getClassification()).isEqualTo("confirmed");
        assertThat(card.getActionType()).isEqualTo("review_only");
    }

    @Test
    void duplicateForPlacementCreatesSeparateCardWithoutDayPlacement() {
        PlaceCard original = sampleCard();
        original.onCreate();
        original.applyDayPlacement(2, 1, (short) 90);

        PlaceCard duplicate = original.duplicateForPlacement();
        duplicate.onCreate();

        assertThat(duplicate.getInstanceId()).isNotEqualTo(original.getInstanceId());
        assertThat(duplicate.getTripId()).isEqualTo(original.getTripId());
        assertThat(duplicate.getName()).isEqualTo(original.getName());
        assertThat(duplicate.getDay()).isNull();
        assertThat(duplicate.getDayOrder()).isNull();
        assertThat(duplicate.getIsExcluded()).isFalse();
    }

    private static PlaceCard sampleCard() {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                "p1", "도톤보리", "place", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카",
                null, null, null, null, null, null, null, null, null, null, null
        );
        return PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");
    }
}
