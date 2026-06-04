package com.tripkey.domain.route;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiRouteRequest;
import com.tripkey.infra.aiengine.dto.AiRouteResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.TreeMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RouteService {

    private final PlaceCardRepository placeCardRepository;
    private final RouteLegCacheRepository routeLegCacheRepository;
    private final AiEngineClient aiEngineClient;

    @Transactional
    public List<RouteLeg> computeLegs(UUID tripId) {
        Map<Integer, List<PlaceCard>> byDay = groupByDay(tripId);
        List<RouteLeg> result = new ArrayList<>();
        for (Map.Entry<Integer, List<PlaceCard>> entry : byDay.entrySet()) {
            result.addAll(computeDayLegs(entry.getKey(), entry.getValue()));
        }
        return result;
    }

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

    private List<RouteLeg> computeDayLegs(int day, List<PlaceCard> cards) {
        List<PlaceCard[]> pairs = new ArrayList<>();
        for (int i = 0; i + 1 < cards.size(); i++) {
            pairs.add(new PlaceCard[]{cards.get(i), cards.get(i + 1)});
        }

        Map<String, RouteLeg> resolved = new LinkedHashMap<>();
        List<AiRouteRequest.Leg> misses = new ArrayList<>();
        for (PlaceCard[] pair : pairs) {
            PlaceCard from = pair[0];
            PlaceCard to = pair[1];
            String key = from.getInstanceId() + "->" + to.getInstanceId();
            Optional<RouteLegCache> cached = routeLegCacheRepository
                    .findByOriginLatAndOriginLngAndDestLatAndDestLng(
                            round(from.getLat()), round(from.getLng()),
                            round(to.getLat()), round(to.getLng()));
            if (cached.isPresent()) {
                RouteLegCache c = cached.get();
                resolved.put(key, new RouteLeg(day, from.getInstanceId(), to.getInstanceId(),
                        c.getDurationSeconds(), c.getDistanceMeters(), c.getMode(), c.getSource()));
            } else {
                misses.add(new AiRouteRequest.Leg(
                        from.getInstanceId().toString(), to.getInstanceId().toString(),
                        new AiRouteRequest.Coord(round(from.getLat()), round(from.getLng())),
                        new AiRouteRequest.Coord(round(to.getLat()), round(to.getLng()))));
            }
        }

        if (!misses.isEmpty()) {
            AiRouteResponse response = aiEngineClient.route(new AiRouteRequest(misses));
            for (AiRouteResponse.Leg leg : response.legs()) {
                UUID fromId = UUID.fromString(leg.fromInstanceId());
                UUID toId = UUID.fromString(leg.toInstanceId());
                String key = fromId + "->" + toId;
                resolved.put(key, new RouteLeg(day, fromId, toId,
                        leg.durationSeconds(), leg.distanceMeters(), leg.mode(), leg.source()));
                if ("google".equals(leg.source())) {
                    AiRouteRequest.Leg req = findRequestLeg(misses, leg.fromInstanceId(), leg.toInstanceId());
                    if (req != null) {
                        routeLegCacheRepository.save(RouteLegCache.of(
                                req.origin().lat(), req.origin().lng(),
                                req.destination().lat(), req.destination().lng(),
                                leg.durationSeconds(), leg.distanceMeters(), leg.mode(), leg.source()));
                    }
                }
            }
        }

        List<RouteLeg> ordered = new ArrayList<>();
        for (PlaceCard[] pair : pairs) {
            String key = pair[0].getInstanceId() + "->" + pair[1].getInstanceId();
            RouteLeg leg = resolved.get(key);
            if (leg != null) ordered.add(leg);
        }
        return ordered;
    }

    private static AiRouteRequest.Leg findRequestLeg(List<AiRouteRequest.Leg> legs, String from, String to) {
        for (AiRouteRequest.Leg leg : legs) {
            if (leg.fromInstanceId().equals(from) && leg.toInstanceId().equals(to)) {
                return leg;
            }
        }
        return null;
    }

    private static double round(double value) {
        return Math.round(value * 100_000.0) / 100_000.0;
    }
}
