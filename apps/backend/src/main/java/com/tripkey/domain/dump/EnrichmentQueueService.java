package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * enrichment 결과 기록 + 카드 상태 전이의 트랜잭션 경계.
 * claim(점유)은 outbox relay 로, 재시도/최종실패는 SQS/DLQ 로 이동했다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EnrichmentQueueService {

    private final PlaceCardRepository placeCardRepository;
    private final AlertCardRepository alertCardRepository;

    /** 성공: alert 멱등 저장 + completed. 카드가 사라졌으면(재파싱 등) 결과 드롭. */
    @Transactional
    public void recordSuccess(UUID tripId, UUID instanceId, AiNonBlockingEnrichmentResponse response) {
        PlaceCard card = placeCardRepository.findById(instanceId).orElse(null);
        if (card == null) {
            log.warn("Enrichment result for missing card dropped. trip={} card={}", tripId, instanceId);
            return;
        }
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
        card.completeEnrichment();
    }

    @Transactional
    public void markProcessing(UUID instanceId) {
        placeCardRepository.findById(instanceId).ifPresent(PlaceCard::markProcessing);
    }

    @Transactional
    public void markEnrichmentFailed(UUID instanceId) {
        placeCardRepository.findById(instanceId).ifPresent(PlaceCard::markFailed);
    }
}
