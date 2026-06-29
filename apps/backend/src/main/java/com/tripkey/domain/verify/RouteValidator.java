package com.tripkey.domain.verify;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.route.RouteService;
import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.dto.placement.RouteWarning;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;

/**
 * SCR-04V 동선 검증. (#277 정확도 보강)
 * - 거리 conflict: 캐시된 실제 이동거리(route_legs) 우선, 없으면 직선거리(PostGIS) 폴백.
 * - 시간 conflict: Day 체류시간 합 + 카드 간 이동시간(route_legs) 합.
 * 이동시간/거리는 RouteService.readCachedLegs(캐시 전용, AI 미호출)로 읽는다.
 */
@Component
@RequiredArgsConstructor
public class RouteValidator {

    static final int DISTANCE_THRESHOLD_METERS = 10_000;
    static final int DURATION_THRESHOLD_MINUTES = 600;

    private final PlaceCardRepository placeCardRepository;
    private final RouteService routeService;

    @Transactional(readOnly = true)
    public List<RouteWarning> validate(UUID tripId) {
        List<RouteLeg> legs = routeService.readCachedLegs(tripId);
        List<RouteWarning> warnings = new ArrayList<>();
        warnings.addAll(distanceWarnings(tripId, legs));
        warnings.addAll(durationWarnings(tripId, legs));
        return warnings;
    }

    private List<RouteWarning> distanceWarnings(UUID tripId, List<RouteLeg> legs) {
        // (from -> to) 실제 이동거리 맵 (캐시 leg 우선)
        Map<String, Integer> realDistance = new HashMap<>();
        for (RouteLeg leg : legs) {
            if (leg.distanceMeters() != null) {
                realDistance.put(legKey(leg.fromInstanceId(), leg.toInstanceId()), leg.distanceMeters());
            }
        }

        List<Object[]> rows = placeCardRepository.findAdjacentCardDistances(tripId);
        List<RouteWarning> result = new ArrayList<>();
        for (Object[] row : rows) {
            UUID idA = (UUID) row[0];
            UUID idB = (UUID) row[1];
            int day = ((Number) row[2]).intValue();
            double straight = ((Number) row[3]).doubleValue();
            Integer real = realDistance.get(legKey(idA, idB));
            int distance = real != null ? real : (int) Math.round(straight);
            if (distance > DISTANCE_THRESHOLD_METERS) {
                result.add(RouteWarning.distance(day, idA, idB, distance));
            }
        }
        return result;
    }

    private List<RouteWarning> durationWarnings(UUID tripId, List<RouteLeg> legs) {
        // Day 별 이동시간(초) 합
        Map<Integer, Integer> travelSecByDay = new HashMap<>();
        for (RouteLeg leg : legs) {
            if (leg.day() != null && leg.durationSeconds() != null) {
                travelSecByDay.merge(leg.day(), leg.durationSeconds(), Integer::sum);
            }
        }

        Map<Integer, List<PlaceCard>> byDay = new TreeMap<>();
        for (PlaceCard card : placeCardRepository.findAllByTripId(tripId)) {
            if (Boolean.TRUE.equals(card.getIsExcluded())) continue;
            if (card.getDay() == null) continue;
            if ("accommodation".equals(card.getCategory())) continue;
            byDay.computeIfAbsent(card.getDay(), k -> new ArrayList<>()).add(card);
        }

        List<RouteWarning> result = new ArrayList<>();
        for (Map.Entry<Integer, List<PlaceCard>> entry : byDay.entrySet()) {
            int stayMinutes = 0;
            List<UUID> instanceIds = new ArrayList<>();
            for (PlaceCard card : entry.getValue()) {
                if (card.getEstimatedDurationMin() != null) {
                    stayMinutes += card.getEstimatedDurationMin();
                }
                instanceIds.add(card.getInstanceId());
            }
            int travelMinutes = travelSecByDay.getOrDefault(entry.getKey(), 0) / 60;
            int total = stayMinutes + travelMinutes;
            if (total > DURATION_THRESHOLD_MINUTES) {
                result.add(RouteWarning.duration(entry.getKey(), instanceIds, total));
            }
        }
        return result;
    }

    private static String legKey(UUID from, UUID to) {
        return from + "->" + to;
    }
}
