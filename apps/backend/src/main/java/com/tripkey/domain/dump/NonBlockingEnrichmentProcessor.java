package com.tripkey.domain.dump;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.trip.Trip;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NonBlockingEnrichmentProcessor {

    private final AiEngineClient aiEngineClient;

    @Async("dumpTaskExecutor")
    public void trigger(List<PlaceCard> cards, List<String> destinations, Trip trip) {
        for (PlaceCard card : cards) {
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
            } catch (Exception e) {
                log.warn("Non-blocking enrichment failed. trip={} card={}",
                        card.getTripId(), card.getInstanceId(), e);
            }
        }
    }
}
