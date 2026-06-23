package com.tripkey.domain.dump;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
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
    private final AlertCardRepository alertCardRepository;
    private final AiEngineClient aiEngineClient;
    private final EnrichmentOutboxRepository enrichmentOutboxRepository;
    private final ObjectMapper objectMapper;

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
                    trip.getCompanionCount(),
                    deserializeAccommodations(job.getAccommodationInputs()),
                    deserializeFlight(job.getDepartureFlight()),
                    deserializeFlight(job.getReturnFlight())
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

            persistAlertCards(job.getTripId(), job.getJobId(), response);

            List<EnrichmentOutbox> outbox = savedCards.stream()
                    .map(card -> EnrichmentOutbox.create(
                            card.getTripId(),
                            card.getInstanceId(),
                            serialize(AiNonBlockingEnrichmentRequest.from(
                                    card, destinations, trip.getTravelDays(), trip.getCompanionCount()))))
                    .toList();
            enrichmentOutboxRepository.saveAll(outbox);

            job.complete(response.contextSummary());
            dumpJobRepository.save(job);
        } catch (Exception e) {
            log.error("Failed to parse dump job. jobId={}", jobId, e);
            job.fail("PARSE_FAILED");
            dumpJobRepository.save(job);
        }
    }

    private String serialize(AiNonBlockingEnrichmentRequest request) {
        try {
            return objectMapper.writeValueAsString(request);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize enrichment request", e);
        }
    }

    private AiParseRequest.FlightInput deserializeFlight(String json) {
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, AiParseRequest.FlightInput.class);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize flight input", e);
        }
    }

    private List<AiParseRequest.AccommodationInput> deserializeAccommodations(String json) {
        if (json == null) {
            return null;
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<AiParseRequest.AccommodationInput>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize accommodation inputs", e);
        }
    }

    private void persistAlertCards(UUID tripId, UUID jobId, AiParseResponse response) {
        if (response.alertCards() == null || response.alertCards().isEmpty()) {
            return;
        }
        List<AiParseResponse.AlertCard> alerts = response.alertCards();
        List<String> alertIds = alerts.stream().map(AiParseResponse.AlertCard::id).toList();
        alertCardRepository.deleteByTripIdAndAlertIdIn(tripId, alertIds);
        List<AlertCard> entities = alerts.stream()
                .map(dto -> AlertCard.fromAiResponse(dto, tripId, jobId))
                .toList();
        alertCardRepository.saveAll(entities);
        log.info("Persisted {} alert cards for trip={} (parse_version={})",
                entities.size(), tripId, response.parseVersion());
    }

}
