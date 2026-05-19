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

    @Async("dumpTaskExecutor")
    public void trigger(List<PlaceCard> cards, List<String> destinations, Trip trip) {
        CompletableFuture<?>[] futures = cards.stream()
                .map(card -> CompletableFuture.runAsync(
                        () -> enrichSingleCard(card, destinations, trip),
                        enrichmentTaskExecutor))
                .toArray(CompletableFuture[]::new);
        CompletableFuture.allOf(futures).join();
    }

    private void enrichSingleCard(PlaceCard card, List<String> destinations, Trip trip) {
        try {
            AiNonBlockingEnrichmentRequest request = AiNonBlockingEnrichmentRequest.from(
                    card,
                    destinations,
                    trip.getTravelDays(),
                    trip.getCompanionCount()
            );
            AiNonBlockingEnrichmentResponse response = aiEngineClient.enrichCardNonBlocking(request);
            int alertCount = response.alertCards() == null ? 0 : response.alertCards().size();
            int patchCount = response.patches() == null ? 0 : response.patches().size();
            if (alertCount > 0 || patchCount > 0) {
                log.info("Non-blocking enrichment completed. trip={} card={} alerts={} patches={}",
                        card.getTripId(), card.getInstanceId(), alertCount, patchCount);
            }
            if (alertCount > 0) {
                persistAlertCards(card.getTripId(), response);
            }
        } catch (Exception e) {
            log.warn("Non-blocking enrichment failed. trip={} card={}",
                    card.getTripId(), card.getInstanceId(), e);
        }
    }

    private void persistAlertCards(UUID tripId, AiNonBlockingEnrichmentResponse response) {
        List<AlertCard> entities = response.alertCards().stream()
                .map(dto -> AlertCard.fromAiResponse(dto, tripId, null))
                .toList();
        alertCardRepository.saveAll(entities);
    }
}
