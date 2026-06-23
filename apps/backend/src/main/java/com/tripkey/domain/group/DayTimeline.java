package com.tripkey.domain.group;

import com.tripkey.domain.place.PlaceCard;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Day 활동 카드(dayOrder 순)에 절대 시각을 배정한다.
 * 고정 시작시각부터 카드별 소요시간 + 카드 간 이동시간(route_legs)을 누적한다.
 * 소요시간 없음/이동시간 캐시 miss 는 0 으로 간주(best-effort).
 */
final class DayTimeline {

    private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");

    private DayTimeline() {
    }

    static Map<UUID, String> compute(
            List<PlaceCard> orderedCards,
            Map<UUID, Integer> travelSecondsByFromInstance,
            LocalTime start) {
        Map<UUID, String> result = new LinkedHashMap<>();
        LocalTime clock = start;
        for (PlaceCard card : orderedCards) {
            result.put(card.getInstanceId(), clock.format(HH_MM));
            int durationMin = card.getEstimatedDurationMin() == null ? 0 : card.getEstimatedDurationMin();
            int travelSec = travelSecondsByFromInstance.getOrDefault(card.getInstanceId(), 0);
            clock = clock.plusMinutes(durationMin).plusSeconds(travelSec);
        }
        return result;
    }
}
