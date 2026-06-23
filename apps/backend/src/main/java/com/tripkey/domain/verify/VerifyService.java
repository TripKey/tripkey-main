package com.tripkey.domain.verify;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.route.RouteService;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.placement.PlacementDay;
import com.tripkey.dto.placement.PlacementDayItem;
import com.tripkey.dto.placement.PlacementSaveRequest;
import com.tripkey.dto.placement.PlacementSaveResponse;
import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.dto.placement.RouteWarning;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final RouteValidator routeValidator;
    private final RouteService routeService;

    /**
     * Snapshot semantics — request 는 trip 의 Day 배치 전체 상태를 나타낸다.
     * request 에 포함된 카드는 갱신되고, 포함되지 않은 카드는 day/day_order 가 null 로 초기화된다.
     * stale instance_id (request 에 있지만 DB 에 없는) 는 응답의 skipped_instance_ids 에 기록되고 저장은 무시한다.
     */
    @Transactional
    public PlacementSaveResponse verifyAndSave(UUID tripId, PlacementSaveRequest request) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<PlacementDay> days = request.days() == null ? List.of() : request.days();

        Map<UUID, PlaceCard> cardsByInstanceId = new HashMap<>();
        for (PlaceCard card : placeCardRepository.findAllByTripId(tripId)) {
            cardsByInstanceId.put(card.getInstanceId(), card);
        }

        Set<UUID> placedInRequest = new HashSet<>();
        List<UUID> skippedInstanceIds = new ArrayList<>();

        for (PlacementDay day : days) {
            for (PlacementDayItem item : day.cards()) {
                placedInRequest.add(item.instanceId());
                PlaceCard card = cardsByInstanceId.get(item.instanceId());
                if (card == null) {
                    skippedInstanceIds.add(item.instanceId());
                    continue;
                }
                Short estimated = item.estimatedDurationMin() == null
                        ? null
                        : item.estimatedDurationMin().shortValue();
                card.applyDayPlacement(day.dayNumber(), item.order(), estimated);
            }
        }

        for (PlaceCard card : cardsByInstanceId.values()) {
            if (!placedInRequest.contains(card.getInstanceId()) && card.getDay() != null) {
                card.clearDayPlacement();
            }
        }

        placeCardRepository.flush();
        List<RouteWarning> routeWarnings = routeValidator.validate(tripId);
        // route leg 계산은 부가정보(best-effort). ai-engine 장애/타임아웃 시에도 Day 배치 저장은 성공해야 한다.
        List<RouteLeg> routeLegs;
        try {
            routeLegs = routeService.computeLegs(tripId);
        } catch (Exception e) {
            log.warn("route leg 계산 실패, 빈 결과로 대체합니다. tripId={}", tripId, e);
            routeLegs = List.of();
        }

        return PlacementSaveResponse.of(tripId, skippedInstanceIds, routeWarnings, routeLegs);
    }
}
