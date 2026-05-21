package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executor;

@Slf4j
@Component
public class NonBlockingEnrichmentProcessor {

    private final AiEngineClient aiEngineClient;
    private final AlertCardRepository alertCardRepository;
    private final Executor enrichmentTaskExecutor;

    public NonBlockingEnrichmentProcessor(
            AiEngineClient aiEngineClient,
            AlertCardRepository alertCardRepository,
            @Qualifier("enrichmentTaskExecutor") Executor enrichmentTaskExecutor) {
        this.aiEngineClient = aiEngineClient;
        this.alertCardRepository = alertCardRepository;
        this.enrichmentTaskExecutor = enrichmentTaskExecutor;
    }

    /**
     * 호출자는 transaction 활성 상태에서 entity → AiNonBlockingEnrichmentRequest 변환을 마치고
     * 이 메서드에 immutable DTO 리스트만 전달해야 한다. 본 메서드는 enrichmentTaskExecutor 의
     * thread 에서 실행되므로 entity 를 직접 받으면 detached 상태에서 lazy 필드 접근 위험이 있다.
     */
    @Async("enrichmentTaskExecutor")
    public void trigger(List<AiNonBlockingEnrichmentRequest> requests) {
        for (AiNonBlockingEnrichmentRequest request : requests) {
            CompletableFuture.runAsync(() -> enrichSingleRequest(request), enrichmentTaskExecutor);
        }
    }

    private void enrichSingleRequest(AiNonBlockingEnrichmentRequest request) {
        UUID tripId = request.tripId();
        UUID instanceId = request.card().instanceId();
        try {
            AiNonBlockingEnrichmentResponse response = aiEngineClient.enrichCardNonBlocking(request);
            int alertCount = response.alertCards() == null ? 0 : response.alertCards().size();
            int patchCount = response.patches() == null ? 0 : response.patches().size();
            if (alertCount > 0 || patchCount > 0) {
                log.info("Non-blocking enrichment completed. trip={} card={} alerts={} patches={}",
                        tripId, instanceId, alertCount, patchCount);
            }
            if (alertCount > 0) {
                persistAlertCards(tripId, response);
            }
        } catch (Exception e) {
            log.warn("Non-blocking enrichment failed. trip={} card={}", tripId, instanceId, e);
        }
    }

    private void persistAlertCards(UUID tripId, AiNonBlockingEnrichmentResponse response) {
        List<AlertCard> entities = response.alertCards().stream()
                .map(dto -> AlertCard.fromAiResponse(dto, tripId, null))
                .toList();
        alertCardRepository.saveAll(entities);
    }
}
