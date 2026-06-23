package com.tripkey.domain.group;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.group.Groups03Response;
import com.tripkey.dto.group.Groups04Response;
import com.tripkey.dto.group.StockGroup;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private static final double SCR04_CLUSTER_EPS_METERS = 1500.0;
    private static final int SCR04_CLUSTER_MIN_POINTS = 1;
    private static final String FALLBACK_LABEL = "기타";

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;

    @Transactional(readOnly = true)
    public Groups03Response getGroups03(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<CardDto> inputRequired = new ArrayList<>();
        List<CardDto> selectRequired = new ArrayList<>();
        List<CardDto> fixRequired = new ArrayList<>();
        List<CardDto> reviewOnly = new ArrayList<>();
        List<CardDto> excluded = new ArrayList<>();

        placeCardRepository.findAllByTripId(tripId).stream()
                .sorted(Comparator.comparing(PlaceCard::getCreatedAt))
                .map(CardDto::from)
                .forEach(card -> {
                    if (Boolean.TRUE.equals(card.isExcluded())) {
                        excluded.add(card);
                        return;
                    }
                    switch (card.actionType()) {
                        case "input_required" -> inputRequired.add(card);
                        case "select_required" -> selectRequired.add(card);
                        case "fix_required" -> fixRequired.add(card);
                        case "review_only" -> reviewOnly.add(card);
                        default -> {
                            // action_type 은 BE 가 계산하는 enum 이므로 정상 동작 시 도달 불가.
                        }
                    }
                });

        return Groups03Response.of(inputRequired, selectRequired, fixRequired, reviewOnly, excluded);
    }

    @Transactional
    public Groups04Response reorderGroups(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }
        placeCardRepository.markAllReordered(tripId);
        return getGroups04(tripId);
    }

    @Transactional(readOnly = true)
    public Groups04Response getGroups04(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<PlaceCard> excluded = new ArrayList<>();
        List<PlaceCard> unavailable = new ArrayList<>();
        List<PlaceCard> pendingReorder = new ArrayList<>();
        List<PlaceCard> availableCandidates = new ArrayList<>();

        for (PlaceCard card : placeCardRepository.findAllByTripId(tripId)) {
            if (Boolean.TRUE.equals(card.getIsExcluded())) {
                excluded.add(card);
                continue;
            }
            String placement = card.getPlacementStatus();
            String processing = card.getProcessingStatus();
            if ("blocked".equals(placement) || "needs_input".equals(placement) || "failed".equals(processing)) {
                unavailable.add(card);
                continue;
            }
            if ("processing".equals(processing) || Boolean.TRUE.equals(card.getPendingReorder())) {
                pendingReorder.add(card);
                continue;
            }
            if (card.getGeom() == null) {
                unavailable.add(card);
                continue;
            }
            availableCandidates.add(card);
        }

        List<StockGroup> available = clusterIntoStockGroups(tripId, availableCandidates);

        return Groups04Response.of(
                available,
                toSortedDtos(pendingReorder),
                toSortedDtos(unavailable),
                toSortedDtos(excluded)
        );
    }

    private List<StockGroup> clusterIntoStockGroups(UUID tripId, List<PlaceCard> candidates) {
        if (candidates.isEmpty()) {
            return List.of();
        }

        Map<UUID, Integer> clusterIdByInstance = placeCardRepository
                .clusterAvailableCards(tripId, SCR04_CLUSTER_EPS_METERS, SCR04_CLUSTER_MIN_POINTS).stream()
                .filter(row -> row[1] != null)
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).intValue(),
                        (a, b) -> a
                ));

        Map<Integer, List<PlaceCard>> cardsByCluster = new HashMap<>();
        for (PlaceCard card : candidates) {
            Integer clusterId = clusterIdByInstance.get(card.getInstanceId());
            if (clusterId == null) {
                continue;
            }
            cardsByCluster.computeIfAbsent(clusterId, k -> new ArrayList<>()).add(card);
        }

        record LabeledCluster(int clusterId, String dominantLabel, List<PlaceCard> cards) {}

        List<LabeledCluster> clusters = cardsByCluster.entrySet().stream()
                .map(e -> new LabeledCluster(e.getKey(), dominantLocation(e.getValue()), e.getValue()))
                .toList();

        Map<String, List<LabeledCluster>> byLabel = clusters.stream()
                .collect(Collectors.groupingBy(LabeledCluster::dominantLabel));

        List<StockGroup> result = new ArrayList<>();
        for (Map.Entry<String, List<LabeledCluster>> entry : byLabel.entrySet()) {
            String baseLabel = entry.getKey();
            List<LabeledCluster> group = entry.getValue();
            if (group.size() == 1) {
                result.add(StockGroup.of(baseLabel, toSortedDtos(group.get(0).cards())));
                continue;
            }
            List<LabeledCluster> ordered = group.stream()
                    .sorted(Comparator
                            .comparingInt((LabeledCluster c) -> c.cards().size()).reversed()
                            .thenComparingInt(LabeledCluster::clusterId))
                    .toList();
            for (int i = 0; i < ordered.size(); i++) {
                result.add(StockGroup.of(
                        baseLabel + " " + (i + 1),
                        toSortedDtos(ordered.get(i).cards())
                ));
            }
        }

        result.sort(Comparator
                .comparingInt((StockGroup g) -> g.cards().size()).reversed()
                .thenComparing(StockGroup::label));
        return result;
    }

    private static String dominantLocation(List<PlaceCard> cards) {
        return cards.stream()
                .map(PlaceCard::getLocation)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.groupingBy(s -> s, Collectors.counting()))
                .entrySet().stream()
                .max(Map.Entry.<String, Long>comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(FALLBACK_LABEL);
    }

    private static List<CardDto> toSortedDtos(List<PlaceCard> cards) {
        return cards.stream()
                .sorted(Comparator.comparing(PlaceCard::getCreatedAt))
                .map(CardDto::from)
                .toList();
    }
}
