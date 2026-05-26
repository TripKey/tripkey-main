package com.tripkey.domain.dump;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import io.awspring.cloud.sqs.annotation.SqsListener;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.UUID;

/** maxReceiveCount 초과로 DLQ 로 이동한 메시지 -> 카드 failed 마킹. */
@Slf4j
@Component
@RequiredArgsConstructor
public class EnrichmentDlqListener {

    private final EnrichmentQueueService queueService;
    private final ObjectMapper objectMapper;

    @SqsListener("${app.enrichment.sqs.dlq-name}")
    public void onDlqMessage(String body) {
        try {
            AiNonBlockingEnrichmentRequest request =
                    objectMapper.readValue(body, AiNonBlockingEnrichmentRequest.class);
            UUID instanceId = request.card().instanceId();
            log.warn("Enrichment message dead-lettered. card={}", instanceId);
            queueService.markEnrichmentFailed(instanceId);
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            log.error("Failed to parse DLQ message; dropping. body={}", body, e);
        }
    }
}
