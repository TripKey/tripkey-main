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
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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

            // 항공/숙박은 AI 받아적기(비결정적, 공항 유실)에 맡기지 않고 구조화 입력에서 결정론적으로 생성한다.
            // 프롬프트 규약상 AI 가 구조화 입력에서 만든 카드(숙박 + flight_role 있는 transport)는 버리고,
            // dump_text 기반 카드만 유지한다.
            List<PlaceCard> aiCards = response.cards() == null
                    ? List.of()
                    : response.cards().stream()
                    .filter(dto -> !isStructuredDerived(dto))
                    .map(card -> PlaceCard.createFromAiResponse(job.getTripId(), card, "ai_parse"))
                    .toList();

            List<PlaceCard> structuredCards = buildStructuredCards(
                    job.getTripId(),
                    request.departureFlight(),
                    request.returnFlight(),
                    request.accommodationInputs());

            List<PlaceCard> cards = new ArrayList<>(aiCards.size() + structuredCards.size());
            cards.addAll(aiCards);
            cards.addAll(structuredCards);

            placeCardRepository.deleteAllByTripId(job.getTripId());

            if (cards.isEmpty()) {
                job.fail("NO_PLACES_FOUND");
                dumpJobRepository.save(job);
                return;
            }

            List<PlaceCard> savedCards = placeCardRepository.saveAll(cards);

            persistAlertCards(job.getTripId(), job.getJobId(), response);

            // 결정론적 항공(transport) 카드는 좌표가 필요 없고 입력값을 AI 가 덮어쓰면 안 되므로 enrichment 제외.
            List<EnrichmentOutbox> outbox = savedCards.stream()
                    .filter(card -> !isDeterministicFlight(card))
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

    /**
     * 프롬프트 규약상 AI 가 구조화 입력에서 생성한 카드를 식별한다.
     * 숙박 카드는 전부, transport 카드는 flight_role 이 채워진 것만 구조화 입력 파생으로 본다.
     * (dump_text 에만 등장한 일반 교통은 flight_role=null 이라 유지된다.)
     */
    private static boolean isStructuredDerived(AiPlaceCardDto dto) {
        String category = dto.category() == null ? "" : dto.category().trim().toLowerCase(Locale.ROOT);
        if ("accommodation".equals(category)) {
            return true;
        }
        return "transport".equals(category) && dto.flightRole() != null && !dto.flightRole().isBlank();
    }

    private List<PlaceCard> buildStructuredCards(
            UUID tripId,
            AiParseRequest.FlightInput departureFlight,
            AiParseRequest.FlightInput returnFlight,
            List<AiParseRequest.AccommodationInput> accommodations) {
        List<PlaceCard> cards = new ArrayList<>();
        if (departureFlight != null && !isBlankFlight(departureFlight)) {
            cards.add(PlaceCard.createFlightCard(tripId,
                    departureFlight.flightNumber(), departureFlight.datetime(), "outbound",
                    departureFlight.departureAirport(), departureFlight.arrivalAirport()));
        }
        if (returnFlight != null && !isBlankFlight(returnFlight)) {
            cards.add(PlaceCard.createFlightCard(tripId,
                    returnFlight.flightNumber(), returnFlight.datetime(), "inbound",
                    returnFlight.departureAirport(), returnFlight.arrivalAirport()));
        }
        if (accommodations != null) {
            for (AiParseRequest.AccommodationInput acc : accommodations) {
                if (acc == null || isBlankAccommodation(acc)) {
                    continue;
                }
                cards.add(PlaceCard.createAccommodationCard(tripId,
                        acc.name(), acc.location(), acc.checkIn(), acc.checkOut()));
            }
        }
        return cards;
    }

    private static boolean isDeterministicFlight(PlaceCard card) {
        return "transport".equals(card.getCategory()) && "user_input".equals(card.getSource());
    }

    private static boolean isBlankFlight(AiParseRequest.FlightInput flight) {
        return isBlank(flight.flightNumber()) && isBlank(flight.datetime())
                && isBlank(flight.departureAirport()) && isBlank(flight.arrivalAirport());
    }

    private static boolean isBlankAccommodation(AiParseRequest.AccommodationInput accommodation) {
        return isBlank(accommodation.name()) && isBlank(accommodation.location())
                && isBlank(accommodation.checkIn()) && isBlank(accommodation.checkOut());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
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
