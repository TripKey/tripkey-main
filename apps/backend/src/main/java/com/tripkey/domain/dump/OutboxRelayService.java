package com.tripkey.domain.dump;

import io.awspring.cloud.sqs.operations.SqsTemplate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Outbox -> SQS 발행 트랜잭션 경계. findPublishable 의 FOR UPDATE SKIP LOCKED 락을
 * 발행 마킹 커밋까지 유지(멀티 인스턴스 이중 발행 방지). SQS publish 는 배치당 짧고
 * 실패 시 backoff 재시도되므로 트랜잭션 내 수행을 허용.
 */
@Slf4j
@Service
public class OutboxRelayService {

    private final EnrichmentOutboxRepository outboxRepository;
    private final SqsTemplate sqsTemplate;
    private final String queueName;
    private final int maxAttempts;

    public OutboxRelayService(
            EnrichmentOutboxRepository outboxRepository,
            SqsTemplate sqsTemplate,
            @Value("${app.enrichment.sqs.queue-name}") String queueName,
            @Value("${app.enrichment.relay.max-attempts:5}") int maxAttempts) {
        this.outboxRepository = outboxRepository;
        this.sqsTemplate = sqsTemplate;
        this.queueName = queueName;
        this.maxAttempts = maxAttempts;
    }

    @Transactional
    public int publishBatch(int batchSize) {
        List<EnrichmentOutbox> rows = outboxRepository.findPublishable(batchSize);
        int published = 0;
        for (EnrichmentOutbox row : rows) {
            try {
                sqsTemplate.send(queueName, row.getPayload());
                row.markPublished(OffsetDateTime.now());
                published++;
            } catch (Exception e) {
                log.warn("Outbox publish failed. id={} attempts={}", row.getId(), row.getAttempts(), e);
                row.recordPublishFailure(OffsetDateTime.now().plusSeconds(30L * (row.getAttempts() + 1)), maxAttempts);
            }
        }
        return published;
    }
}
