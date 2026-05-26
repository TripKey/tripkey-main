package com.tripkey.domain.dump;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import io.awspring.cloud.sqs.annotation.SqsListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * enrichment SQS 컨슈머. 메시지 본문(AiNonBlockingEnrichmentRequest JSON) 소비 ->
 * 카드 processing 마킹 -> AI 호출 -> recordSuccess(멱등). 실패 시 예외를 전파해
 * SQS 가 visibility timeout 후 재전달; maxReceiveCount 초과 시 DLQ 로 이동.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EnrichmentSqsListener {

    private final AiEngineClient aiEngineClient;
    private final EnrichmentQueueService queueService;
    private final ObjectMapper objectMapper;

    @SqsListener("${app.enrichment.sqs.queue-name}")
    public void onMessage(String body) {
        // SQS at-least-once: 재전달 시 markProcessing/AI 재호출/recordSuccess 가 다시 실행되지만
        // recordSuccess 가 alert (trip_id, alert_id) 삭제-후-삽입으로 멱등이라 안전(중복 미발생).
        AiNonBlockingEnrichmentRequest request = deserialize(body);
        UUID tripId = request.tripId();
        UUID instanceId = request.card().instanceId();
        queueService.markProcessing(instanceId);
        AiNonBlockingEnrichmentResponse response = aiEngineClient.enrichCardNonBlocking(request);
        queueService.recordSuccess(tripId, instanceId, response);
        log.info("Enrichment processed. trip={} card={}", tripId, instanceId);
    }

    private AiNonBlockingEnrichmentRequest deserialize(String body) {
        try {
            return objectMapper.readValue(body, AiNonBlockingEnrichmentRequest.class);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize enrichment message", e);
        }
    }
}
