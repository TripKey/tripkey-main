package com.tripkey.domain.optimize;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.optimize.OptimizeResponse;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderRequest;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * SCR-04 동선 최적화 1차
 * Day 내 방문 순서를 총 이동시간 최소가 되도록 AI 엔진으로 최적화한 "제안"을 반환한다
 * 저장하지 않는다 — 사용자가 수락하면 verify/save 로 day_order 에 반영
 */
@Service
@RequiredArgsConstructor
public class OptimizeService {

    private static final double COORD_PRECISION = 100_000.0; // 좌표 5자리(약 1m) 반올림

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final AiEngineClient aiEngineClient;

    @Transactional(readOnly = true)
    public OptimizeResponse optimize(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        Map<Integer, List<PlaceCard>> byDay = groupByDay(tripId);
        List<OptimizeResponse.DayOrder> days = new ArrayList<>();

        for (Map.Entry<Integer, List<PlaceCard>> entry : byDay.entrySet()) {
            List<PlaceCard> cards = entry.getValue();
            if (cards.size() < 2) {
                continue; // 최적화할 게 없음 (0~1개)
            }

            List<AiOptimizeOrderRequest.Stop> stops = new ArrayList<>();
            for (PlaceCard card : cards) {
                stops.add(new AiOptimizeOrderRequest.Stop(
                        card.getInstanceId().toString(),
                        new AiOptimizeOrderRequest.Coord(round(card.getLat()), round(card.getLng()))));
            }

            AiOptimizeOrderResponse response = aiEngineClient.optimizeOrder(
                    new AiOptimizeOrderRequest(stops, accommodationAnchor(cards), flightEndAnchor(cards)));

            List<UUID> orderedIds = response.orderedInstanceIds().stream()
                    .map(UUID::fromString)
                    .toList();

            days.add(new OptimizeResponse.DayOrder(
                    entry.getKey(), orderedIds, response.totalDurationSeconds(), response.source()));
        }

        return OptimizeResponse.of(tripId, days);
    }

    /** Day 시작 앵커 — 숙소 카드가 있으면 그 instance_id, 없으면 null(시작 자유). */
    private static String accommodationAnchor(List<PlaceCard> cards) {
        for (PlaceCard card : cards) {
            if ("accommodation".equals(card.getCategory())) {
                return card.getInstanceId().toString();
            }
        }
        return null;
    }

    /**
     * Day 종료 앵커 — 교통(항공) 카드가 있으면 그 instance_id(마지막날 출발 전 종료), 없으면 null(종료 자유).
     * 시작 앵커(숙소)와 카테고리가 달라 충돌하지 않는다. (좌표 없는 항공 카드는 stops 에 없어 AI 가 무시)
     */
    private static String flightEndAnchor(List<PlaceCard> cards) {
        for (PlaceCard card : cards) {
            if ("transport".equals(card.getCategory())) {
                return card.getInstanceId().toString();
            }
        }
        return null;
    }

    /** RouteService.groupByDay 와 동일 기준: 제외 X, day 있음, 좌표 있음, day_order 정렬. */
    private Map<Integer, List<PlaceCard>> groupByDay(UUID tripId) {
        Map<Integer, List<PlaceCard>> byDay = new TreeMap<>();
        for (PlaceCard card : placeCardRepository.findAllByTripId(tripId)) {
            if (Boolean.TRUE.equals(card.getIsExcluded())) continue;
            if (card.getDay() == null) continue;
            if (card.getLat() == null || card.getLng() == null) continue;
            byDay.computeIfAbsent(card.getDay(), k -> new ArrayList<>()).add(card);
        }
        for (List<PlaceCard> cards : byDay.values()) {
            cards.sort(Comparator.comparing(c -> c.getDayOrder() == null ? Short.MAX_VALUE : c.getDayOrder()));
        }
        return byDay;
    }

    private static double round(double value) {
        return Math.round(value * COORD_PRECISION) / COORD_PRECISION;
    }
}
