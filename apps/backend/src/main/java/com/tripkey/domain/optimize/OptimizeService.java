package com.tripkey.domain.optimize;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.optimize.OptimizeResponse;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderRequest;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * SCR-04 동선 최적화 1차
 * Day 내 방문 순서를 총 이동시간 최소가 되도록 AI 엔진으로 최적화한 "제안"을 반환한다
 * 저장하지 않는다 — 사용자가 수락하면 verify/save 로 day_order 에 반영
 */
@Service
@RequiredArgsConstructor
public class OptimizeService {

    private static final double COORD_PRECISION = 100_000.0; // 좌표 5자리(약 1m) 반올림

    // time_constraint 자유 텍스트(예: "14:30 예약")에서 예약 시각 추출 — #275 시간창 제약
    private static final Pattern RESERVED_TIME = Pattern.compile("([01]?\\d|2[0-3]):([0-5]\\d)");

    // opening_hours jsonb 파싱용 — 읽기 전용이라 공유 안전 (#292)
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final AiEngineClient aiEngineClient;

    @Transactional(readOnly = true)
    public OptimizeResponse optimize(UUID tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new TripNotFoundException(tripId));

        Map<Integer, List<PlaceCard>> byDay = groupByDay(tripId);
        List<OptimizeResponse.DayOrder> days = new ArrayList<>();

        for (Map.Entry<Integer, List<PlaceCard>> entry : byDay.entrySet()) {
            List<PlaceCard> cards = entry.getValue();
            if (cards.size() < 2) {
                continue; // 최적화할 게 없음 (0~1개)
            }

            // Day N 의 요일(0=일~6=토, Google 규약). 여행 시작일이 없으면 null → 영업시간 제약 생략 (#292)
            Integer weekday = weekdayOf(trip.getStartDate(), entry.getKey());

            List<AiOptimizeOrderRequest.Stop> stops = new ArrayList<>();
            for (PlaceCard card : cards) {
                boolean pinned = card.getTimeConstraint() != null && !card.getTimeConstraint().isBlank();
                String[] window = openingWindow(card.getOpeningHours(), weekday);
                stops.add(new AiOptimizeOrderRequest.Stop(
                        card.getInstanceId().toString(),
                        new AiOptimizeOrderRequest.Coord(round(card.getLat()), round(card.getLng())),
                        pinned,
                        reservedTime(card.getTimeConstraint()),
                        card.getEstimatedDurationMin() == null ? null : card.getEstimatedDurationMin().intValue(),
                        window == null ? null : window[0],
                        window == null ? null : window[1]));
            }

            String start = startAnchor(cards);
            AiOptimizeOrderResponse response = aiEngineClient.optimizeOrder(
                    new AiOptimizeOrderRequest(stops, start, endAnchor(cards, start)));

            List<UUID> orderedIds = response.orderedInstanceIds().stream()
                    .map(UUID::fromString)
                    .toList();

            days.add(new OptimizeResponse.DayOrder(
                    entry.getKey(), orderedIds, response.totalDurationSeconds(), response.source()));
        }

        return OptimizeResponse.of(tripId, days);
    }

    /**
     * Day 시작 앵커 — 도착 항공편(outbound, 첫날 공항 도착 후 시작)이 있으면 그 카드,
     * 없으면 숙소 카드, 둘 다 없으면 null(시작 자유). #275
     */
    private static String startAnchor(List<PlaceCard> cards) {
        String outbound = flightByRole(cards, "outbound");
        return outbound != null ? outbound : accommodationAnchor(cards);
    }

    /**
     * Day 종료 앵커 — 출발 항공편(inbound, 마지막날 출발 전 종료)이 있으면 그 카드,
     * 없으면 역할 없는 교통 카드(시작 앵커 제외), 그것도 없으면 숙소(귀가 closed-tour:
     * 시작 앵커와 같은 id 가 전달되면 AI 가 숙소 복귀 순환 경로로 최적화한다). #275
     * (좌표 없는 항공 카드는 stops 에 없어 AI 가 무시)
     */
    private static String endAnchor(List<PlaceCard> cards, String startAnchor) {
        String inbound = flightByRole(cards, "inbound");
        if (inbound != null) {
            return inbound;
        }
        for (PlaceCard card : cards) {
            if ("transport".equals(card.getCategory())
                    && !Objects.equals(card.getInstanceId().toString(), startAnchor)) {
                return card.getInstanceId().toString();
            }
        }
        return accommodationAnchor(cards);
    }

    private static String flightByRole(List<PlaceCard> cards, String role) {
        for (PlaceCard card : cards) {
            if ("transport".equals(card.getCategory()) && role.equals(card.getFlightRole())) {
                return card.getInstanceId().toString();
            }
        }
        return null;
    }

    /** 숙소 카드가 있으면 그 instance_id, 없으면 null. */
    private static String accommodationAnchor(List<PlaceCard> cards) {
        for (PlaceCard card : cards) {
            if ("accommodation".equals(card.getCategory())) {
                return card.getInstanceId().toString();
            }
        }
        return null;
    }

    /** Day N(1-based)의 요일 — 0=일 ~ 6=토(Google 규약). 시작일이 없거나 유효하지 않으면 null. */
    private static Integer weekdayOf(LocalDate startDate, Integer day) {
        if (startDate == null || day == null || day < 1) {
            return null;
        }
        // DayOfWeek: MON=1..SUN=7 → %7 로 SUN=0..SAT=6 변환
        return startDate.plusDays(day - 1L).getDayOfWeek().getValue() % 7;
    }

    /**
     * opening_hours jsonb 에서 해당 요일의 영업시간 전체 스팬 [open, close] 추출 (#292).
     * 구간이 여럿(브레이크 타임)이면 가장 이른 open ~ 가장 늦은 close 를 쓴다(보수적 완화).
     * 데이터 없음/휴무/파싱 실패 시 null(제약 없음).
     */
    private static String[] openingWindow(String openingHoursJson, Integer weekday) {
        if (openingHoursJson == null || weekday == null) {
            return null;
        }
        try {
            JsonNode intervals = OBJECT_MAPPER.readTree(openingHoursJson).path(String.valueOf(weekday));
            if (!intervals.isArray() || intervals.isEmpty()) {
                return null; // 해당 요일 데이터 없음 = 휴무 또는 미수집 → 제약 생략
            }
            String open = null;
            String close = null;
            for (JsonNode interval : intervals) {
                if (!interval.isArray() || interval.size() < 2) {
                    continue;
                }
                String o = interval.get(0).asText(null);
                String c = interval.get(1).asText(null);
                if (o == null || c == null) {
                    continue;
                }
                // "HH:MM" 제로패딩 형식이라 문자열 비교 = 시각 비교
                open = (open == null || o.compareTo(open) < 0) ? o : open;
                close = (close == null || c.compareTo(close) > 0) ? c : close;
            }
            return (open == null || close == null) ? null : new String[]{open, close};
        } catch (Exception e) {
            return null; // 방어: 영업시간 파싱 실패가 최적화를 깨면 안 됨
        }
    }

    /** time_constraint 자유 텍스트에서 첫 "HH:MM" 을 추출해 정규화. 없거나 파싱 불가면 null. */
    private static String reservedTime(String timeConstraint) {
        if (timeConstraint == null) {
            return null;
        }
        Matcher m = RESERVED_TIME.matcher(timeConstraint);
        if (!m.find()) {
            return null;
        }
        try {
            return String.format("%02d:%02d", Integer.parseInt(m.group(1)), Integer.parseInt(m.group(2)));
        } catch (NumberFormatException e) {
            return null; // 정규식상 도달 불가지만 정적 분석 만족용 방어
        }
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
