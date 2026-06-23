package com.tripkey.domain.dump;

import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EnrichmentSqsListenerTest {

    @Mock AiEngineClient aiEngineClient;
    @Mock EnrichmentQueueService queueService;

    private EnrichmentSqsListener listener;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        listener = new EnrichmentSqsListener(aiEngineClient, queueService, objectMapper);
    }

    @Test
    void onMessageMarksProcessingThenRecordsSuccess() throws Exception {
        AiNonBlockingEnrichmentRequest req = sampleRequest();
        String body = objectMapper.writeValueAsString(req);
        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenReturn(new AiNonBlockingEnrichmentResponse(null, List.of(), List.of()));

        listener.onMessage(body);

        verify(queueService).markProcessing(req.card().instanceId());
        verify(aiEngineClient).enrichCardNonBlocking(any());
        verify(queueService).recordSuccess(eq(req.tripId()), eq(req.card().instanceId()), any());
    }

    @Test
    void onMessageRethrowsOnAiFailureSoSqsRetries() throws Exception {
        AiNonBlockingEnrichmentRequest req = sampleRequest();
        String body = objectMapper.writeValueAsString(req);
        when(aiEngineClient.enrichCardNonBlocking(any())).thenThrow(new IllegalStateException("timeout"));

        assertThatThrownBy(() -> listener.onMessage(body)).isInstanceOf(RuntimeException.class);
        verify(queueService, never()).recordSuccess(any(), any(), any());
    }

    private AiNonBlockingEnrichmentRequest sampleRequest() {
        PlaceCard card = PlaceCard.createFromAiResponse(
                UUID.randomUUID(),
                new AiPlaceCardDto(null, "도톈보리", "place", "confirmed", "ready_partial",
                        false, false, (short) 90, null, "오사카",
                        null, null, null, null, null, null, null, null, null, null, null),
                "ai_parse");
        try {
            var f = PlaceCard.class.getDeclaredField("instanceId");
            f.setAccessible(true);
            f.set(card, UUID.randomUUID());
        } catch (ReflectiveOperationException e) { throw new IllegalStateException(e); }
        return AiNonBlockingEnrichmentRequest.from(card, List.of("오사카"), (short) 3, (short) 2);
    }
}
