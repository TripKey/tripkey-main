package com.tripkey.domain.verify;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
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

@Component
@RequiredArgsConstructor
public class RouteValidator {

    static final int DISTANCE_THRESHOLD_METERS = 10_000;
    static final int DURATION_THRESHOLD_MINUTES = 600;

    private final PlaceCardRepository placeCardRepository;

    @Transactional(readOnly = true)
    public List<RouteWarning> validate(UUID tripId) {
        List<RouteWarning> warnings = new ArrayList<>();
        warnings.addAll(distanceWarnings(tripId));
        warnings.addAll(durationWarnings(tripId));
        return warnings;
    }

    private List<RouteWarning> distanceWarnings(UUID tripId) {
        List<Object[]> rows = placeCardRepository.findAdjacentCardDistances(tripId);
        List<RouteWarning> result = new ArrayList<>();
        for (Object[] row : rows) {
            UUID idA = (UUID) row[0];
            UUID idB = (UUID) row[1];
            int day = ((Number) row[2]).intValue();
            double distance = ((Number) row[3]).doubleValue();
            if (distance > DISTANCE_THRESHOLD_METERS) {
                result.add(RouteWarning.distance(day, idA, idB, (int) Math.round(distance)));
            }
        }
        return result;
    }

    private List<RouteWarning> durationWarnings(UUID tripId) {
        Map<Integer, List<PlaceCard>> byDay = new TreeMap<>();
        for (PlaceCard card : placeCardRepository.findAllByTripId(tripId)) {
            if (Boolean.TRUE.equals(card.getIsExcluded())) continue;
            if (card.getDay() == null) continue;
            if ("accommodation".equals(card.getCategory())) continue;
            byDay.computeIfAbsent(card.getDay(), k -> new ArrayList<>()).add(card);
        }

        List<RouteWarning> result = new ArrayList<>();
        for (Map.Entry<Integer, List<PlaceCard>> entry : byDay.entrySet()) {
            int total = 0;
            List<UUID> instanceIds = new ArrayList<>();
            for (PlaceCard card : entry.getValue()) {
                if (card.getEstimatedDurationMin() != null) {
                    total += card.getEstimatedDurationMin();
                }
                instanceIds.add(card.getInstanceId());
            }
            if (total > DURATION_THRESHOLD_MINUTES) {
                result.add(RouteWarning.duration(entry.getKey(), instanceIds, total));
            }
        }
        return result;
    }
}
