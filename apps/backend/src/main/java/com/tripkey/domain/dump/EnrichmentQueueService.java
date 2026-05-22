package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * enrichment 작업 큐의 트랜잭션 경계.
 * claim 마킹과 결과 기록만 트랜잭션으로 처리하며, 실제 AI 외부 호출은
 * EnrichmentQueueWorker 가 트랜잭션 밖에서 수행한다 (행 락이 외부 호출 동안 점유되지 않도록).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnrichmentQueueService {

    private final PlaceCardRepository placeCardRepository;
    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final AlertCardRepository alertCardRepository;

    /**
     * pending/stale 카드를 batchSize 만큼 claim(processing 마킹)하고,
     * tripId 단위로 trip/destinations 를 1회 조회해 AI 요청 DTO 로 변환해 반환한다.
     * FOR UPDATE SKIP LOCKED 로 다중 인스턴스 간 이중 claim 을 막는다.
     */
    @Transactional
    public List<AiNonBlockingEnrichmentRequest> claimBatch(int batchSize, int claimTimeoutSeconds) {
        List<PlaceCard> claimed = placeCardRepository.findClaimablePendingCards(claimTimeoutSeconds, batchSize);
        if (claimed.isEmpty()) {
            return List.of();
        }
        OffsetDateTime now = OffsetDateTime.now();
        claimed.forEach(card -> card.claimForEnrichment(now));

        Map<UUID, List<PlaceCard>> byTrip = claimed.stream()
                .collect(Collectors.groupingBy(PlaceCard::getTripId));

        List<AiNonBlockingEnrichmentRequest> requests = new ArrayList<>();
        for (Map.Entry<UUID, List<PlaceCard>> entry : byTrip.entrySet()) {
            UUID tripId = entry.getKey();
            Trip trip = tripRepository.findById(tripId).orElse(null);
            if (trip == null) {
                // trip 이 사라진 카드(현재 삭제 플로우 없음). 마킹은 됐으나 요청은 생략 ->
                // stale 회수 대상으로 남는다. 운영상 발생하지 않는 엣지.
                log.warn("Trip not found for claimed enrichment cards. trip={} count={}",
                        tripId, entry.getValue().size());
                continue;
            }
            List<String> destinations = tripDestinationRepository
                    .findByTripTripIdOrderBySortOrder(tripId).stream()
                    .map(TripDestination::getName)
                    .distinct()
                    .toList();
            for (PlaceCard card : entry.getValue()) {
                requests.add(AiNonBlockingEnrichmentRequest.from(
                        card, destinations, trip.getTravelDays(), trip.getCompanionCount()));
            }
        }
        return requests;
    }

    /**
     * enrichment 성공 기록: alert 멱등 저장 + 카드 completed 전이.
     * alert 는 (trip_id, alert_id) 삭제 후 삽입 (재전달/재시도 시 중복 방지).
     */
    @Transactional
    public void recordSuccess(UUID tripId, UUID instanceId, AiNonBlockingEnrichmentResponse response) {
        List<AiParseResponse.AlertCard> alerts = response.alertCards();
        if (alerts != null && !alerts.isEmpty()) {
            List<String> alertIds = alerts.stream().map(AiParseResponse.AlertCard::id).toList();
            alertCardRepository.deleteByTripIdAndAlertIdIn(tripId, alertIds);
            alertCardRepository.flush();
            List<AlertCard> entities = alerts.stream()
                    .map(dto -> AlertCard.fromAiResponse(dto, tripId, null))
                    .toList();
            alertCardRepository.saveAll(entities);
        }
        placeCardRepository.findById(instanceId).ifPresent(PlaceCard::completeEnrichment);
    }

    /**
     * enrichment 실패 기록: attempts++ 후 maxAttempts 미만이면 pending 재시도, 이상이면 failed.
     */
    @Transactional
    public void recordFailure(UUID instanceId, int maxAttempts) {
        placeCardRepository.findById(instanceId)
                .ifPresent(card -> card.failEnrichmentAttempt(maxAttempts));
    }
}
