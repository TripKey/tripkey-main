package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.trip.Trip;
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
     * 비동기 진입을 enrichmentTaskExecutor 로 처리해 dumpTaskExecutor 점유를 피한다.
     * 호출 thread (transaction 활성 상태) 에서 PlaceCard / Trip entity 를 즉시 immutable request DTO 로
     * 변환한 뒤 각 카드별 작업을 enrichmentTaskExecutor 에 submit. join 없이 fire-and-forget 으로 종료.
     */
    @Async("enrichmentTaskExecutor")
    public void trigger(List<PlaceCard> cards, List<String> destinations, Trip trip) {
        List<AiNonBlockingEnrichmentRequest> requests = cards.stream()
                .map(card -> AiNonBlockingEnrichmentRequest.from(
                        card,
                        destinations,
                        trip.getTravelDays(),
                        trip.getCompanionCount()))
                .toList();

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
