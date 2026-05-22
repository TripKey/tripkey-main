package com.tripkey.domain.dump;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EnrichmentDlqListenerTest {

    @Mock EnrichmentQueueService queueService;

    private EnrichmentDlqListener listener;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        listener = new EnrichmentDlqListener(queueService, objectMapper);
    }

    @Test
    void onDlqMessageMarksCardFailed() throws Exception {
        AiNonBlockingEnrichmentRequest req = sampleRequest();
        String body = objectMapper.writeValueAsString(req);

        listener.onDlqMessage(body);

        verify(queueService).markEnrichmentFailed(req.card().instanceId());
    }

    @Test
    void onDlqMessageDropsUnparseableWithoutThrow() {
        assertDoesNotThrow(() -> listener.onDlqMessage("not-json"));
        verify(queueService, never()).markEnrichmentFailed(any());
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
