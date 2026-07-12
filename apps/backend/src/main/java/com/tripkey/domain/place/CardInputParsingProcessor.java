package com.tripkey.domain.place;

import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiCardParseRequest;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
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
public class CardInputParsingProcessor {

    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final PlaceCardRepository placeCardRepository;
    private final AlertCardRepository alertCardRepository;
    private final AiEngineClient aiEngineClient;

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

            if (card.isQuestionParseResult(parsed)) {
                card.applyCardLevelQuestionResult(parsed);
                placeCardRepository.save(card);
                log.info("Card-level input parsing updated question card. trip={} card={} classification={} placement={}",
                        tripId, instanceId, parsed.classification(), parsed.placementStatus());
                return;
            }

            if (!card.isConfirmedParseResult(parsed)) {
                card.markProcessingFailed();
                placeCardRepository.save(card);
                log.warn("Card-level input parsing returned unsupported result. trip={} card={} classification={}",
                        tripId, instanceId, parsed.classification());
                return;
            }

            card.applyCardLevelParseResult(parsed);
            if (parsed.placeId() != null && !parsed.placeId().isBlank()) {
                card.markProcessingCompleted();
            } else {
                card.markProcessingFailed();
            }
            placeCardRepository.save(card);
            if ("completed".equals(card.getProcessingStatus())) {
                // 카드 재파싱 전 상태에서 생성된 연결 alert는 더 이상 유효하다고 볼 수 없다.
                // 카드 파서가 새 alert를 반환하지 않으므로 성공 시 기존 스냅샷을 무효화한다.
                alertCardRepository.deleteAll(
                        alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(tripId).stream()
                                .filter(alert -> alert.relatedInstanceUuids().contains(instanceId))
                                .toList());
            }
        } catch (Exception e) {
            card.markProcessingFailed();
            placeCardRepository.save(card);
            log.warn("Card-level input parsing failed. trip={} card={}", tripId, instanceId, e);
        }
    }
}
