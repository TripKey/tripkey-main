package com.tripkey.domain.dump;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class OutboxRelay {

    private final OutboxRelayService relayService;
    private final int batchSize;

    public OutboxRelay(
            OutboxRelayService relayService,
            @Value("${app.enrichment.relay.batch-size:10}") int batchSize) {
        this.relayService = relayService;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${app.enrichment.relay.poll-interval-ms:2000}")
    public void poll() {
        try {
            relayService.publishBatch(batchSize);
        } catch (Exception e) {
            log.warn("Outbox relay batch failed; will retry next poll.", e);
        }
    }
}
