package com.tripkey.domain.place;

import com.tripkey.common.exception.CardNotFoundException;
import com.tripkey.common.exception.FlightCardDuplicateRoleException;
import com.tripkey.common.exception.InvalidClassificationTransitionException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.dump.DumpJobRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardAddRequest;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.card.CardPatchRequest;
import com.tripkey.dto.card.CardsResponse;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private DumpJobRepository dumpJobRepository;

    @Mock
    private CardInputParsingProcessor cardInputParsingProcessor;
    
    @Mock
    private AlertCardRepository alertCardRepository;

    @InjectMocks
    private CardService cardService;

    @Test
    void getCardsReturnsEmptyWhenNoCardsAndNoDumpJob() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(dumpJobRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId)).thenReturn(Optional.empty());
        when(alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(tripId)).thenReturn(List.of());

        CardsResponse response = cardService.getCards(tripId);

        assertThat(response.cards()).isEmpty();
        assertThat(response.contextSummary()).isNull();
        assertThat(response.alertCards()).isEmpty();
    }

    @Test
    void getCardsReturnsAlertCardsInCreatedAtAscOrder() {
        UUID tripId = UUID.randomUUID();
        UUID relatedId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(dumpJobRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId)).thenReturn(Optional.empty());

        AlertCard alert = AlertCard.fromAiResponse(
                new AiParseResponse.AlertCard(
                        "alert-1",
                        "timing_conflict",
                        "practical",
                        "trip",
                        null,
                        "체크인이 항공편보다 빨라요",
                        List.of(relatedId)
                ),
                tripId,
                UUID.randomUUID()
        );
        when(alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(tripId)).thenReturn(List.of(alert));

        CardsResponse response = cardService.getCards(tripId);

        assertThat(response.alertCards()).hasSize(1);
        assertThat(response.alertCards().get(0).id()).isEqualTo("alert-1");
        assertThat(response.alertCards().get(0).type()).isEqualTo("timing_conflict");
        assertThat(response.alertCards().get(0).category()).isEqualTo("practical");
        assertThat(response.alertCards().get(0).scope()).isEqualTo("trip");
        assertThat(response.alertCards().get(0).day()).isNull();
        assertThat(response.alertCards().get(0).relatedInstanceIds()).containsExactly(relatedId);
    }

    @Test
    void getCardsAlertCardWithNullRelatedInstancesReturnsEmptyList() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(dumpJobRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId)).thenReturn(Optional.empty());

        AlertCard alert = AlertCard.fromAiResponse(
                new AiParseResponse.AlertCard(
                        "alert-2",
                        "festival",
                        "insight",
                        "trip",
                        null,
                        "축제 기간입니다",
                        null
                ),
                tripId,
                null
        );
        when(alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(tripId)).thenReturn(List.of(alert));

        CardsResponse response = cardService.getCards(tripId);

        assertThat(response.alertCards()).hasSize(1);
        assertThat(response.alertCards().get(0).relatedInstanceIds()).isEmpty();
    }

    @Test
    void getCardsThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        assertThatThrownBy(() -> cardService.getCards(tripId))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void addCardCreatesUserCardWithDefaults() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardAddRequest request = new CardAddRequest(
                "도톤보리",
                "place",
                "오사카 중앙구",
                (short) 90,
                null,
                "저녁 방문",
                null,
                null,
                null
        );

        CardDto created = cardService.addCard(tripId, request);

        assertThat(created.classification()).isEqualTo("confirmed");
        assertThat(created.processingStatus()).isEqualTo("processing");
        assertThat(created.placementStatus()).isEqualTo("ready_partial");
        assertThat(created.actionType()).isEqualTo("review_only");
        assertThat(created.isAiGenerated()).isFalse();
        assertThat(created.canExclude()).isTrue();
        assertThat(created.allowDuplicate()).isFalse();
        assertThat(created.source()).isEqualTo("manual");
    }

    @Test
    void addCardSetsAccommodationDefaults() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardAddRequest request = new CardAddRequest(
                "난바 호텔",
                "accommodation",
                "오사카 난바역 근처",
                null,
                null,
                null,
                "2025-08-01",
                "2025-08-04",
                null
        );

        CardDto created = cardService.addCard(tripId, request);

        assertThat(created.canExclude()).isFalse();
        assertThat(created.allowDuplicate()).isTrue();
        assertThat(created.checkIn()).isEqualTo("2025-08-01");
        assertThat(created.checkOut()).isEqualTo("2025-08-04");
    }

    @Test
    void addCardRejectsDuplicateFlightNumber() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.existsByTripIdAndCategoryAndFlightNumber(
                eq(tripId), eq("transport"), eq("KE723")))
                .thenReturn(true);

        CardAddRequest request = new CardAddRequest(
                "김포 → 오사카",
                "transport",
                null,
                null,
                "08:30 출발",
                null,
                null,
                null,
                "KE723"
        );

        assertThatThrownBy(() -> cardService.addCard(tripId, request))
                .isInstanceOf(FlightCardDuplicateRoleException.class);
    }

    @Test
    void patchCardConfirmsOpenQuestion() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = openQuestionCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, "confirmed", null, null, null, null, null, null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.classification()).isEqualTo("confirmed");
    }

    @Test
    void patchCardRejectsInvalidTransition() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = userPlaceCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));

        CardPatchRequest request = new CardPatchRequest(
                null, "open_question", null, null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> cardService.patchCard(tripId, instanceId, request))
                .isInstanceOf(InvalidClassificationTransitionException.class);
    }

    @Test
    void patchCardThrowsCardNotFound() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.empty());

        CardPatchRequest request = new CardPatchRequest(
                null, null, true, null, null, null, null, null, null, null
        );

        assertThatThrownBy(() -> cardService.patchCard(tripId, instanceId, request))
                .isInstanceOf(CardNotFoundException.class);
    }

    @Test
    void patchCardAccommodationEditTriggersReprocessing() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = userAccommodationCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, null, null, null, null, "2025-08-02", "2025-08-05", null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.processingStatus()).isEqualTo("processing");
        assertThat(updated.checkIn()).isEqualTo("2025-08-02");
        assertThat(updated.checkOut()).isEqualTo("2025-08-05");
    }

    @Test
    void patchCardNotesTriggersCardLevelParsingForNeedsInputCard() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = needsInputCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, null, null, "친구 집은 오사카 난바역 근처야", null, null, null, null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.processingStatus()).isEqualTo("processing");
        assertThat(updated.notes()).isEqualTo("친구 집은 오사카 난바역 근처야");
        verify(cardInputParsingProcessor).parseAndEnrich(tripId, instanceId, "친구 집은 오사카 난바역 근처야");
    }

    @Test
    void patchCardNotesTriggersCardLevelParsingForReadyPartialUndecidedCard() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = undecidedReadyPartialCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, null, null, "스시 옵션 말고 난바 라멘집으로 할게", null, null, null, null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.processingStatus()).isEqualTo("processing");
        verify(cardInputParsingProcessor).parseAndEnrich(tripId, instanceId, "스시 옵션 말고 난바 라멘집으로 할게");
    }

    @Test
    void patchCardNotesCanRetryFailedCard() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = userPlaceCard(tripId);
        card.markProcessingFailed();

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, null, null, "도톤보리 글리코 사인으로 확정", null, null, null, null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.processingStatus()).isEqualTo("processing");
        verify(cardInputParsingProcessor).parseAndEnrich(tripId, instanceId, "도톤보리 글리코 사인으로 확정");
    }

    @Test
    void patchCardNotesOnConfirmedCardStoresWithoutParsing() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = userPlaceCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));

        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, null, null, "여기 가자", null, null, null, null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.notes()).isEqualTo("여기 가자");
        assertThat(updated.processingStatus()).isEqualTo("processing");
        verify(cardInputParsingProcessor, never()).parseAndEnrich(any(), any(), any());
    }

    @Test
    void patchCardNotesOnOpenQuestionCardStoresWithoutParsing() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = openQuestionCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));

        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, null, null, "여기 포함해줘", null, null, null, null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.notes()).isEqualTo("여기 포함해줘");
        assertThat(updated.processingStatus()).isEqualTo("completed");
        verify(cardInputParsingProcessor, never()).parseAndEnrich(any(), any(), any());
    }

    @Test
    void patchCardMemoDoesNotTriggerCardLevelParsing() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        PlaceCard card = needsInputCard(tripId);

        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId))
                .thenReturn(Optional.of(card));
        when(placeCardRepository.save(any(PlaceCard.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CardPatchRequest request = new CardPatchRequest(
                null, null, null, null, "자유 메모만 저장", null, null, null, null, null
        );

        CardDto updated = cardService.patchCard(tripId, instanceId, request);

        assertThat(updated.memo()).isEqualTo("자유 메모만 저장");
        assertThat(updated.processingStatus()).isEqualTo("completed");
        verify(cardInputParsingProcessor, never()).parseAndEnrich(any(), any(), any());
    }

    private PlaceCard userPlaceCard(UUID tripId) {
        return PlaceCard.createUserCard(
                tripId, "도톤보리", "place", null, null, null, null, null, null, null
        );
    }

    private PlaceCard userAccommodationCard(UUID tripId) {
        return PlaceCard.createUserCard(
                tripId, "난바 호텔", "accommodation", null, null, null, null,
                "2025-08-01", "2025-08-04", null
        );
    }

    private PlaceCard openQuestionCard(UUID tripId) {
        com.tripkey.infra.aiengine.dto.AiPlaceCardDto dto = new com.tripkey.infra.aiengine.dto.AiPlaceCardDto(
                null, "테라로사", "food", "open_question", "ready_partial",
                false, false, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null, null, null
        );
        return PlaceCard.createFromAiResponse(tripId, dto, "ai_parse");
    }

    private PlaceCard needsInputCard(UUID tripId) {
        com.tripkey.infra.aiengine.dto.AiPlaceCardDto dto = new com.tripkey.infra.aiengine.dto.AiPlaceCardDto(
                null, "친구집", "place", "undecided", "needs_input",
                false, false, null, null, null, null, null, null, null,
                "친구집 위치를 알려주세요", null, null, null, null, null, null, null, null
        );
        return PlaceCard.createFromAiResponse(tripId, dto, "ai_parse");
    }

    private PlaceCard undecidedReadyPartialCard(UUID tripId) {
        com.tripkey.infra.aiengine.dto.AiPlaceCardDto dto = new com.tripkey.infra.aiengine.dto.AiPlaceCardDto(
                null, "저녁 식당", "food", "undecided", "ready_partial",
                false, false, null, null, null, null, null, null, null,
                "어떤 식당으로 할까요?", List.of("스시", "라멘"), null, null, null, null, null, null, null
        );
        return PlaceCard.createFromAiResponse(tripId, dto, "ai_parse");
    }
}
