package com.tripkey.domain.dump;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiParseRequest;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class DumpAsyncProcessor {

    private final DumpJobRepository dumpJobRepository;
    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final PlaceCardRepository placeCardRepository;
    private final AiEngineClient aiEngineClient;
    private final NonBlockingEnrichmentProcessor nonBlockingEnrichmentProcessor;

    @Async("dumpTaskExecutor")
    @Transactional
    public void process(UUID jobId) {
        DumpJob job = dumpJobRepository.findById(jobId).orElse(null);
        if (job == null) {
            log.warn("Dump job not found. jobId={}", jobId);
            return;
        }

        job.markProcessing((short) 1);
        dumpJobRepository.save(job);

        try {
            Trip trip = tripRepository.findById(job.getTripId())
                    .orElseThrow(() -> new IllegalStateException("Trip not found for dump job"));

            List<String> destinations = tripDestinationRepository
                    .findByTripTripIdOrderBySortOrder(job.getTripId()).stream()
                    .map(TripDestination::getName)
                    .distinct()
                    .toList();

            AiParseRequest request = new AiParseRequest(
                    job.getTripId(),
                    job.getDumpText(),
                    destinations,
                    trip.getTravelDays(),
                    trip.getCompanionCount()
            );

            AiParseResponse response = aiEngineClient.parseDump(request);

            job.updateStep((short) 2);
            dumpJobRepository.save(job);

            List<PlaceCard> cards = response.cards() == null
                    ? List.of()
                    : response.cards().stream()
                    .map(card -> PlaceCard.createFromAiResponse(job.getTripId(), card, "ai_parse"))
                    .toList();

            placeCardRepository.deleteAllByTripId(job.getTripId());

            if (cards.isEmpty()) {
                job.fail("NO_PLACES_FOUND");
                dumpJobRepository.save(job);
                return;
            }

            List<PlaceCard> savedCards = placeCardRepository.saveAll(cards);

            if (response.alertCards() != null && !response.alertCards().isEmpty()) {
                log.info("Received {} alert cards for trip={} (parse_version={})",
                        response.alertCards().size(), job.getTripId(), response.parseVersion());
                // TODO[SCR-03]: persist alert_cards alongside Cards SSOT (`GET /trips/{trip_id}/cards`).
            }

            job.complete(response.contextSummary());
            dumpJobRepository.save(job);
            triggerNonBlockingEnrichment(savedCards, destinations, trip);
        } catch (Exception e) {
            log.error("Failed to parse dump job. jobId={}", jobId, e);
            job.fail("PARSE_FAILED");
            dumpJobRepository.save(job);
        }
    }

    private void triggerNonBlockingEnrichment(List<PlaceCard> cards, List<String> destinations, Trip trip) {
        try {
            nonBlockingEnrichmentProcessor.trigger(cards, destinations, trip);
        } catch (Exception e) {
            log.warn("Failed to submit non-blocking enrichment. trip={}", trip.getTripId(), e);
        }
    }
}
