package com.tripkey.domain.dump;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.trip.Trip;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NonBlockingEnrichmentProcessorTest {

    @Mock
    private AiEngineClient aiEngineClient;

    @InjectMocks
    private NonBlockingEnrichmentProcessor nonBlockingEnrichmentProcessor;

    @Test
    void triggerSwallowsCardLevelEnrichmentFailure() {
        PlaceCard card = PlaceCard.createFromAiResponse(
                UUID.randomUUID(),
                new AiPlaceCardDto(
                        null,
                        "도톤보리",
                        "place",
                        "confirmed",
                        "ready_partial",
                        false,
                        false,
                        (short) 90,
                        null,
                        "오사카",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null
                ),
                "ai_parse"
        );
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
}
