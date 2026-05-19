package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.trip.Trip;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NonBlockingEnrichmentProcessorTest {

    @Mock
    private AiEngineClient aiEngineClient;

    @Mock
    private AlertCardRepository alertCardRepository;

    private NonBlockingEnrichmentProcessor nonBlockingEnrichmentProcessor;

    @BeforeEach
    void setUp() {
        // 단위 테스트는 호출 스레드에서 동기 실행으로 동시성 비결정성 제거.
        // 실제 enrichmentTaskExecutor 의 fixed-pool 동시성은 통합 테스트 영역.
        nonBlockingEnrichmentProcessor = new NonBlockingEnrichmentProcessor(
                aiEngineClient,
                alertCardRepository,
                Runnable::run
        );
    }

    @Test
    void triggerSwallowsCardLevelEnrichmentFailure() {
        PlaceCard card = placeCard(UUID.randomUUID());
        Trip trip = new Trip((short) 3, (short) 2);
        when(aiEngineClient.enrichCardNonBlocking(any())).thenThrow(new IllegalStateException("timeout"));

        assertDoesNotThrow(() -> nonBlockingEnrichmentProcessor.trigger(List.of(card), List.of("오사카"), trip));
    }

    @Test
    void triggerPassesFlightFieldsToAiEngineSnapshot() {
        PlaceCard card = PlaceCard.createFromAiResponse(
                UUID.randomUUID(),
                new AiPlaceCardDto(
                        null,
                        "ICN-NRT",
                        "transport",
                        "confirmed",
                        "ready",
                        false,
                        true,
                        null,
                        null,
                        null,
                        null,
                        "09:00 출발",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "KE703",
                        "2026-07-01T09:00:00+09:00",
                        "outbound"
                ),
                "ai_parse"
        );
        Trip trip = new Trip((short) 3, (short) 2);
        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenReturn(new AiNonBlockingEnrichmentResponse(null, List.of(), List.of()));

        nonBlockingEnrichmentProcessor.trigger(List.of(card), List.of("도쿄"), trip);

        ArgumentCaptor<AiNonBlockingEnrichmentRequest> captor =
                ArgumentCaptor.forClass(AiNonBlockingEnrichmentRequest.class);
        verify(aiEngineClient).enrichCardNonBlocking(captor.capture());

        AiNonBlockingEnrichmentRequest.CardSnapshot snapshot = captor.getValue().card();
        assertThat(snapshot.flightNumber()).isEqualTo("KE703");
        assertThat(snapshot.flightDatetime()).isEqualTo("2026-07-01T09:00:00+09:00");
        assertThat(snapshot.flightRole()).isEqualTo("outbound");
    }

    @Test
    void triggerPersistsAlertsWithNullJobIdWhenEnrichmentReturnsAlerts() {
        UUID tripId = UUID.randomUUID();
        PlaceCard card = placeCard(tripId);
        Trip trip = new Trip((short) 3, (short) 2);
        AiParseResponse.AlertCard insightAlert = new AiParseResponse.AlertCard(
                "alert-insight-1", "festival", "insight", "trip", null, "축제 기간입니다", null
        );
        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenReturn(new AiNonBlockingEnrichmentResponse(null, List.of(), List.of(insightAlert)));

        nonBlockingEnrichmentProcessor.trigger(List.of(card), List.of("오사카"), trip);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AlertCard>> captor = ArgumentCaptor.forClass(List.class);
        verify(alertCardRepository).saveAll(captor.capture());
        List<AlertCard> persisted = captor.getValue();
        assertThat(persisted).hasSize(1);
        assertThat(persisted.get(0).getAlertId()).isEqualTo("alert-insight-1");
        assertThat(persisted.get(0).getTripId()).isEqualTo(tripId);
        assertThat(persisted.get(0).getJobId()).isNull();
    }

    @Test
    void triggerInvokesEnrichmentForEveryCardInBatch() {
        UUID tripId = UUID.randomUUID();
        PlaceCard a = placeCard(tripId);
        PlaceCard b = placeCard(tripId);
        PlaceCard c = placeCard(tripId);
        Trip trip = new Trip((short) 3, (short) 2);
        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenReturn(new AiNonBlockingEnrichmentResponse(null, List.of(), List.of()));

        nonBlockingEnrichmentProcessor.trigger(List.of(a, b, c), List.of("오사카"), trip);

        verify(aiEngineClient, times(3)).enrichCardNonBlocking(any());
    }

    @Test
    void triggerIsolatesPerCardFailureFromOtherCards() {
        UUID tripId = UUID.randomUUID();
        PlaceCard failing = placeCard(tripId);
        PlaceCard succeeding = placeCard(tripId);
        Trip trip = new Trip((short) 3, (short) 2);

        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenThrow(new IllegalStateException("first card timeout"))
                .thenReturn(new AiNonBlockingEnrichmentResponse(null, List.of(), List.of()));

        assertDoesNotThrow(() ->
                nonBlockingEnrichmentProcessor.trigger(List.of(failing, succeeding), List.of("오사카"), trip));

        verify(aiEngineClient, times(2)).enrichCardNonBlocking(any());
    }

    private PlaceCard placeCard(UUID tripId) {
        return PlaceCard.createFromAiResponse(
                tripId,
                new AiPlaceCardDto(
                        null, "도톤보리", "place", "confirmed", "ready_partial",
                        false, false, (short) 90, null, "오사카",
                        null, null, null, null, null, null, null, null, null, null, null
                ),
                "ai_parse"
        );
    }
}
