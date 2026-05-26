package com.tripkey.domain.dump;

import io.awspring.cloud.sqs.operations.SqsTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OutboxRelayTest {

    @Mock OutboxRelayService relayService;
    @Mock SqsTemplate sqsTemplate;
    @Mock EnrichmentOutboxRepository outboxRepository;

    private OutboxRelay relay;

    @BeforeEach
    void setUp() {
        relay = new OutboxRelay(relayService, 10);
    }

    @Test
    void pollDelegatesToRelayServicePublishBatch() {
        when(relayService.publishBatch(10)).thenReturn(3);
        relay.poll();
        verify(relayService).publishBatch(10);
    }

    @Test
    void pollSwallowsExceptions() {
        when(relayService.publishBatch(10)).thenThrow(new IllegalStateException("sqs down"));
        relay.poll();
        verify(relayService).publishBatch(10);
    }

    @Test
    void publishBatchMarksPublishedOnSuccess() {
        EnrichmentOutbox row = EnrichmentOutbox.create(UUID.randomUUID(), UUID.randomUUID(), "{}");
        OutboxRelayService svc = new OutboxRelayService(outboxRepository, sqsTemplate, "q", 5);
        when(outboxRepository.findPublishable(10)).thenReturn(List.of(row));

        int n = svc.publishBatch(10);

        verify(sqsTemplate).send(eq("q"), any(String.class));
        assertThat(row.getStatus()).isEqualTo("published");
        assertThat(n).isEqualTo(1);
    }

    @Test
    void publishBatchRecordsFailureOnSqsError() {
        EnrichmentOutbox row = EnrichmentOutbox.create(UUID.randomUUID(), UUID.randomUUID(), "{}");
        OutboxRelayService svc = new OutboxRelayService(outboxRepository, sqsTemplate, "q", 5);
        when(outboxRepository.findPublishable(10)).thenReturn(List.of(row));
        doThrow(new RuntimeException("sqs error")).when(sqsTemplate).send(eq("q"), any(String.class));

        svc.publishBatch(10);

        assertThat(row.getAttempts()).isEqualTo(1);
        assertThat(row.getStatus()).isEqualTo("pending");
    }
}
