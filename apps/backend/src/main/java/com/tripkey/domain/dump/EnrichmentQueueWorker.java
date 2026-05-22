package com.tripkey.domain.dump;

import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

/**
 * place_cards 기반 enrichment 작업 큐 컨슈머.
 * @Scheduled 폴링(비트랜잭션) -> EnrichmentQueueService.claimBatch 로 작업을 점유 ->
 * 카드별 AI 호출을 bounded executor(concurrency)로 병렬 실행 -> 결과를 서비스에 기록.
 * fixedDelay 라 직전 폴링이 끝난 뒤에야 다음 폴링이 시작되므로 인스턴스 내 배치 중첩이 없다.
 */
@Slf4j
@Component
public class EnrichmentQueueWorker {

    private final EnrichmentQueueService queueService;
    private final AiEngineClient aiEngineClient;
    private final Executor executor;
    private final int batchSize;
    private final int maxAttempts;
    private final int claimTimeoutSeconds;

    @Autowired
    public EnrichmentQueueWorker(
            EnrichmentQueueService queueService,
            AiEngineClient aiEngineClient,
            @Value("${app.enrichment.concurrency:3}") int concurrency,
            @Value("${app.enrichment.batch-size:10}") int batchSize,
            @Value("${app.enrichment.max-attempts:3}") int maxAttempts,
            @Value("${app.enrichment.claim-timeout-seconds:60}") int claimTimeoutSeconds) {
        this(queueService, aiEngineClient,
                Executors.newFixedThreadPool(concurrency, runnable -> {
                    Thread t = new Thread(runnable, "enrichment-worker");
                    t.setDaemon(true);
                    return t;
                }),
                batchSize, maxAttempts, claimTimeoutSeconds);
    }

    // 테스트용: 동기 executor 주입으로 결정적 검증.
    EnrichmentQueueWorker(
            EnrichmentQueueService queueService,
            AiEngineClient aiEngineClient,
            Executor executor,
            int batchSize,
            int maxAttempts,
            int claimTimeoutSeconds) {
        this.queueService = queueService;
        this.aiEngineClient = aiEngineClient;
        this.executor = executor;
        this.batchSize = batchSize;
        this.maxAttempts = maxAttempts;
        this.claimTimeoutSeconds = claimTimeoutSeconds;
    }

    @Scheduled(fixedDelayString = "${app.enrichment.poll-interval-ms:2000}")
    public void poll() {
        List<AiNonBlockingEnrichmentRequest> requests;
        try {
            requests = queueService.claimBatch(batchSize, claimTimeoutSeconds);
        } catch (Exception e) {
            log.warn("Enrichment claim failed; will retry next poll.", e);
            return;
        }
        if (requests.isEmpty()) {
            return;
        }

        CompletableFuture<?>[] futures = requests.stream()
                .map(request -> CompletableFuture.runAsync(() -> processOne(request), executor))
                .toArray(CompletableFuture[]::new);
        CompletableFuture.allOf(futures).join();
    }

    private void processOne(AiNonBlockingEnrichmentRequest request) {
        UUID tripId = request.tripId();
        UUID instanceId = request.card().instanceId();
        try {
            AiNonBlockingEnrichmentResponse response = aiEngineClient.enrichCardNonBlocking(request);
            queueService.recordSuccess(tripId, instanceId, response);
        } catch (Exception e) {
            log.warn("Non-blocking enrichment failed. trip={} card={}", tripId, instanceId, e);
            try {
                queueService.recordFailure(instanceId, maxAttempts);
            } catch (Exception recordError) {
                log.warn("Failed to record enrichment failure. card={}", instanceId, recordError);
            }
        }
    }
}
