package com.tripkey.domain.place;

import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiCardParseRequest;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import com.tripkey.infra.google.GooglePlacesClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CardInputParsingProcessor {

    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final PlaceCardRepository placeCardRepository;
    private final AiEngineClient aiEngineClient;
    private final GooglePlacesClient googlePlacesClient;

    @Async("dumpTaskExecutor")
    @Transactional
    public void parseAndEnrich(UUID tripId, UUID instanceId, String naturalLanguageInput) {
        PlaceCard card = placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)
                .orElse(null);
        Trip trip = tripRepository.findById(tripId).orElse(null);

        if (card == null || trip == null) {
            log.warn("Card-level input parsing skipped. trip={} card={}", tripId, instanceId);
            return;
        }

        List<String> destinations = tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId).stream()
                .map(TripDestination::getName)
                .toList();

        try {
            AiCardParseRequest request = AiCardParseRequest.from(
                    card,
                    destinations,
                    trip.getTravelDays(),
                    trip.getCompanionCount(),
                    naturalLanguageInput
            );
            AiPlaceCardDto parsed = aiEngineClient.parseCard(request);

            if (!card.isConfirmedParseResult(parsed)) {
                card.markProcessingFailed();
                placeCardRepository.save(card);
                log.warn("Card-level input parsing returned non-confirmed result. trip={} card={} classification={}",
                        tripId, instanceId, parsed.classification());
                return;
            }

            card.applyCardLevelParseResult(parsed);
            Optional<GooglePlacesClient.PlaceLookupResult> lookupResult = googlePlacesClient.lookup(card, destinations);
            if (lookupResult.isPresent()) {
                card.applyPlaceLookupResult(lookupResult.get());
                card.markProcessingCompleted();
            } else {
                card.markProcessingFailed();
            }
            placeCardRepository.save(card);
        } catch (Exception e) {
            card.markProcessingFailed();
            placeCardRepository.save(card);
            log.warn("Card-level input parsing failed. trip={} card={}", tripId, instanceId, e);
        }
    }
}
