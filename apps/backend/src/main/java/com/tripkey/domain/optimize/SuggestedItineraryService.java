package com.tripkey.domain.optimize;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.optimize.SuggestedItineraryResponse;
import com.tripkey.dto.optimize.SuggestedItineraryRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SuggestedItineraryService {
    private static final double CLUSTER_EPS_METERS = 1500.0;
    private static final int DEFAULT_DURATION_MINUTES = 90;

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final OptimizeService optimizeService;

    @Transactional(readOnly = true)
    public SuggestedItineraryResponse suggest(UUID tripId, SuggestedItineraryRequest request) {
        Policy policy = Policy.from(request);
        Trip trip = tripRepository.findById(tripId).orElseThrow(() -> new TripNotFoundException(tripId));
        int dayCount = Math.max(1, trip.getTravelDays().intValue());
        List<PlaceCard> all = placeCardRepository.findAllByTripId(tripId);
        Map<UUID, PlaceCard> eligible = new HashMap<>();
        List<SuggestedItineraryResponse.UnplacedCard> unplaced = new ArrayList<>();
        for (PlaceCard card : all) {
            if (Boolean.TRUE.equals(card.getIsExcluded())) continue;
            if (card.getGeom() == null) {
                unplaced.add(new SuggestedItineraryResponse.UnplacedCard(card.getInstanceId(), "MISSING_COORDINATE"));
            } else if ("processing".equals(card.getProcessingStatus()) || "blocked".equals(card.getPlacementStatus())
                    || "undecided".equals(card.getClassification()) || "needs_input".equals(card.getPlacementStatus())) {
                unplaced.add(new SuggestedItineraryResponse.UnplacedCard(card.getInstanceId(), "REQUIRES_USER_DECISION"));
            } else {
                eligible.put(card.getInstanceId(), card);
            }
        }

        Map<Integer, List<PlaceCard>> clusters = new HashMap<>();
        for (Object[] row : placeCardRepository.clusterAvailableCards(tripId, CLUSTER_EPS_METERS, 1)) {
            PlaceCard card = eligible.get((UUID) row[0]);
            if (card != null && row[1] != null) clusters.computeIfAbsent(((Number) row[1]).intValue(), k -> new ArrayList<>()).add(card);
        }
        List<List<PlaceCard>> byDay = new ArrayList<>();
        List<Map<Integer, Integer>> clusterCountsByDay = new ArrayList<>();
        for (int i = 0; i < dayCount; i++) byDay.add(new ArrayList<>());
        for (int i = 0; i < dayCount; i++) clusterCountsByDay.add(new HashMap<>());

        List<Map.Entry<Integer, List<PlaceCard>>> orderedClusters = clusters.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<Integer, List<PlaceCard>> e) -> durationOf(e.getValue())).reversed()).toList();
        for (Map.Entry<Integer, List<PlaceCard>> clusterEntry : orderedClusters) {
            int clusterId = clusterEntry.getKey();
            List<PlaceCard> cards = clusterEntry.getValue().stream()
                    .sorted(Comparator.comparingInt(card -> categoryPriority(card, policy))).toList();
            for (PlaceCard card : cards) {
                int target = bestDay(card, clusterId, byDay, clusterCountsByDay, policy);
                if (target < 0) {
                    String reason = isFood(card) && byDay.stream().allMatch(day -> foodCount(day) >= policy.maxFoodPerDay())
                            ? "CATEGORY_CAPACITY_EXCEEDED" : "DAILY_CAPACITY_EXCEEDED";
                    unplaced.add(new SuggestedItineraryResponse.UnplacedCard(card.getInstanceId(), reason));
                    continue;
                }
                byDay.get(target).add(card);
                clusterCountsByDay.get(target).merge(clusterId, 1, Integer::sum);
            }
        }

        List<SuggestedItineraryResponse.SuggestedDay> days = new ArrayList<>();
        for (int i = 0; i < byDay.size(); i++) {
            List<PlaceCard> cards = byDay.get(i);
            if (cards.isEmpty()) continue;
            OptimizeService.DayOrderSuggestion order = optimizeService.optimizeDay(trip, i + 1, cards);
            days.add(new SuggestedItineraryResponse.SuggestedDay(i + 1, "추천 동선", order.orderedInstanceIds(), order.totalDurationSeconds()));
        }
        return new SuggestedItineraryResponse(tripId, days, unplaced);
    }

    private int durationOf(List<PlaceCard> cards) { return cards.stream().mapToInt(this::durationOf).sum(); }
    private int durationOf(PlaceCard card) { return card.getEstimatedDurationMin() == null ? DEFAULT_DURATION_MINUTES : card.getEstimatedDurationMin(); }

    private int bestDay(PlaceCard card, int clusterId, List<List<PlaceCard>> byDay,
                        List<Map<Integer, Integer>> clusterCountsByDay, Policy policy) {
        int bestDay = -1;
        int bestScore = Integer.MIN_VALUE;
        for (int i = 0; i < byDay.size(); i++) {
            List<PlaceCard> day = byDay.get(i);
            if (day.size() >= policy.maxCardsPerDay()) continue;
            if (durationOf(day) + durationOf(card) > policy.targetMinutes()) continue;
            if (isFood(card) && foodCount(day) >= policy.maxFoodPerDay()) continue;
            int sameCluster = clusterCountsByDay.get(i).getOrDefault(clusterId, 0);
            int categoryPenalty = isFood(card) ? foodCount(day) * policy.foodRepeatPenalty() : 0;
            int score = sameCluster * 100 - durationOf(day) - day.size() * 30 - categoryPenalty;
            if (score > bestScore) { bestScore = score; bestDay = i; }
        }
        return bestDay;
    }

    private static boolean isFood(PlaceCard card) { return "food".equals(card.getCategory()); }
    private static int foodCount(List<PlaceCard> cards) { return (int) cards.stream().filter(SuggestedItineraryService::isFood).count(); }
    private static int categoryPriority(PlaceCard card, Policy policy) {
        if (policy.sightseeingFirst() && !isFood(card)) return 0;
        if (!policy.sightseeingFirst() && isFood(card)) return 0;
        return 1;
    }

    private record Policy(int targetMinutes, int maxCardsPerDay, int maxFoodPerDay,
                          int foodRepeatPenalty, boolean sightseeingFirst) {
        static Policy from(SuggestedItineraryRequest request) {
            int minutes = switch (request.pace()) { case RELAXED -> 360; case NORMAL -> 480; case PACKED -> 600; };
            int cards = switch (request.pace()) { case RELAXED -> 4; case NORMAL -> 6; case PACKED -> 8; };
            return switch (request.travelStyle()) {
                case SIGHTSEEING -> new Policy(minutes, cards, 2, 120, true);
                case FOOD -> new Policy(minutes, cards, 4, 20, false);
                case BALANCED -> new Policy(minutes, cards, 3, 70, true);
            };
        }
    }
}
