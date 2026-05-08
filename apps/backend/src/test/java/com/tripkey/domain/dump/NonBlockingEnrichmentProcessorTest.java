package com.tripkey.domain.dump;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.trip.Trip;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
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
}
