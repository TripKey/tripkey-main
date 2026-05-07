package com.tripkey.domain.place;

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
                null,
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
        assertThat(card.getProcessingStatus()).isEqualTo("completed");
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
                "KE723"
        );

        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), dto, "ai_parse");

        assertThat(card.getCategory()).isEqualTo("transport");
        assertThat(card.getCanExclude()).isFalse();
        assertThat(card.getAllowDuplicate()).isTrue();
        assertThat(card.getFlightNumber()).isEqualTo("KE723");
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
}
