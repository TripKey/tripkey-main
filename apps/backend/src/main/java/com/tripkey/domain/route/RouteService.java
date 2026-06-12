package com.tripkey.domain.route;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
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
    private final TripRepository tripRepository;

    private static final double COORD_PRECISION = 100_000.0; // 좌표 5자리(약 1m) 반올림

    // @Transactional 미선언: 호출자(VerifyService.verifyAndSave)의 트랜잭션에 참여한다. 카드 read 와 캐시 saveAll 만 수행하며, 라우트 계산은 부가정보이므로 호출자에서 best-effort 로 감싼다.
    public List<RouteLeg> computeLegs(UUID tripId) {
        Map<Integer, List<PlaceCard>> byDay = groupByDay(tripId);
        List<RouteLeg> result = new ArrayList<>();
        List<RouteLegCache> cacheRows = new ArrayList<>();
        for (Map.Entry<Integer, List<PlaceCard>> entry : byDay.entrySet()) {
            result.addAll(computeDayLegs(entry.getKey(), entry.getValue(), cacheRows));
        }
        // route_legs_cache 의 unique (origin_lat, origin_lng, dest_lat, dest_lng) 제약 위반을 막기 위해
        // 동일 좌표 튜플의 캐시 행은 첫 번째만 남기고 dedupe 한다. (result 의 RouteLeg 는 그대로 유지)
        if (!cacheRows.isEmpty()) {
            Map<String, RouteLegCache> deduped = new LinkedHashMap<>();
            for (RouteLegCache row : cacheRows) {
                String coordKey = row.getOriginLat() + "," + row.getOriginLng()
                        + "," + row.getDestLat() + "," + row.getDestLng();
                deduped.putIfAbsent(coordKey, row);
            }
            routeLegCacheRepository.saveAll(deduped.values());
        }
        return result;
    }

    /**
     * 현재 배치(day/day_order) 기준 인접 카드쌍을 route_legs_cache 에서만 조회해 복원한다.
     * computeLegs 와 달리 cache miss 시 AI 를 호출하지 않고(매 조회 비용 회피) 해당 구간을 생략하며,
     * 캐시에 쓰지 않는 순수 읽기 전용이다. 확정 화면 재진입/새로고침에서 이동시간 복원에 사용한다.
     */
    @Transactional(readOnly = true)
    public List<RouteLeg> readCachedLegs(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }
        Map<Integer, List<PlaceCard>> byDay = groupByDay(tripId);
        List<RouteLeg> result = new ArrayList<>();
        for (Map.Entry<Integer, List<PlaceCard>> entry : byDay.entrySet()) {
            int day = entry.getKey();
            List<PlaceCard> cards = entry.getValue();
            for (int i = 0; i + 1 < cards.size(); i++) {
                PlaceCard from = cards.get(i);
                PlaceCard to = cards.get(i + 1);
                Optional<RouteLegCache> cached = routeLegCacheRepository
                        .findByOriginLatAndOriginLngAndDestLatAndDestLng(
                                round(from.getLat()), round(from.getLng()),
                                round(to.getLat()), round(to.getLng()));
                if (cached.isPresent()) {
                    RouteLegCache c = cached.get();
                    result.add(new RouteLeg(day, from.getInstanceId(), to.getInstanceId(),
                            c.getDurationSeconds(), c.getDistanceMeters(), c.getMode(), c.getSource()));
                }
                // cache miss → 생략 (AI 미호출, 캐시 미기록)
            }
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

    private List<RouteLeg> computeDayLegs(int day, List<PlaceCard> cards, List<RouteLegCache> cacheRows) {
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
                        cacheRows.add(RouteLegCache.of(
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
        return Math.round(value * COORD_PRECISION) / COORD_PRECISION;
    }
}
