package com.tripkey.domain.dump;

import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.domain.place.PlaceCard;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EnrichmentQueueWorkerTest {

    @Mock private EnrichmentQueueService queueService;
    @Mock private AiEngineClient aiEngineClient;

    private EnrichmentQueueWorker worker;

    @BeforeEach
    void setUp() {
        // 단위 테스트는 호출 스레드 동기 실행으로 동시성 비결정성 제거.
        worker = new EnrichmentQueueWorker(
                queueService, aiEngineClient, Runnable::run, 10, 3, 60);
    }

    @Test
    void pollRecordsSuccessForEachClaimedRequest() {
        UUID tripId = UUID.randomUUID();
        AiNonBlockingEnrichmentRequest r1 = request(tripId);
        AiNonBlockingEnrichmentRequest r2 = request(tripId);
        when(queueService.claimBatch(10, 60)).thenReturn(List.of(r1, r2));
        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenReturn(new AiNonBlockingEnrichmentResponse(null, List.of(), List.of()));

        worker.poll();

        verify(aiEngineClient, times(2)).enrichCardNonBlocking(any());
        verify(queueService).recordSuccess(eq(tripId), eq(r1.card().instanceId()), any());
        verify(queueService).recordSuccess(eq(tripId), eq(r2.card().instanceId()), any());
        verify(queueService, never()).recordFailure(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    @Test
    void pollRecordsFailureWhenAiCallThrows() {
        UUID tripId = UUID.randomUUID();
        AiNonBlockingEnrichmentRequest r1 = request(tripId);
        when(queueService.claimBatch(10, 60)).thenReturn(List.of(r1));
        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenThrow(new IllegalStateException("timeout"));

        assertDoesNotThrow(() -> worker.poll());

        verify(queueService).recordFailure(r1.card().instanceId(), 3);
        verify(queueService, never()).recordSuccess(any(), any(), any());
    }

    @Test
    void pollDoesNothingWhenClaimEmpty() {
        when(queueService.claimBatch(10, 60)).thenReturn(List.of());

        worker.poll();

        verify(aiEngineClient, never()).enrichCardNonBlocking(any());
        verify(queueService, never()).recordSuccess(any(), any(), any());
        verify(queueService, never()).recordFailure(any(), org.mockito.ArgumentMatchers.anyInt());
    }

    private AiNonBlockingEnrichmentRequest request(UUID tripId) {
        PlaceCard card = PlaceCard.createFromAiResponse(
                tripId,
                new AiPlaceCardDto(
                        null, "도톈보리", "place", "confirmed", "ready_partial",
                        false, false, (short) 90, null, "오사카",
                        null, null, null, null, null, null, null, null, null, null, null),
                "ai_parse");
        setInstanceId(card, UUID.randomUUID());
        return AiNonBlockingEnrichmentRequest.from(card, List.of("오사카"), (short) 3, (short) 2);
    }

    private static void setInstanceId(PlaceCard card, UUID id) {
        try {
            java.lang.reflect.Field field = PlaceCard.class.getDeclaredField("instanceId");
            field.setAccessible(true);
            field.set(card, id);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
