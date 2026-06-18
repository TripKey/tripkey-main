package com.tripkey.domain.group;

import com.tripkey.domain.place.PlaceCard;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DayTimelineTest {

    private static PlaceCard card(UUID id, Short estimatedDurationMin) {
        try {
            Constructor<PlaceCard> ctor = PlaceCard.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            PlaceCard c = ctor.newInstance();
            setField(c, "instanceId", id);
            setField(c, "estimatedDurationMin", estimatedDurationMin);
            return c;
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field f = PlaceCard.class.getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void assignsStartTimeThenAccumulatesDurationAndTravel() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        UUID c = UUID.randomUUID();
        List<PlaceCard> ordered = List.of(card(a, (short) 60), card(b, (short) 90), card(c, null));
        Map<UUID, Integer> travelSeconds = Map.of(a, 1800, b, 600); // a->b 30분, b->c 10분

        Map<UUID, String> times = DayTimeline.compute(ordered, travelSeconds, LocalTime.of(9, 0));

        assertThat(times.get(a)).isEqualTo("09:00");
        assertThat(times.get(b)).isEqualTo("10:30"); // 09:00 + 60분 + 30분
        assertThat(times.get(c)).isEqualTo("12:10"); // 10:30 + 90분 + 10분
    }

    @Test
    void treatsNullDurationAndMissingTravelAsZero() {
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        List<PlaceCard> ordered = List.of(card(a, null), card(b, (short) 30));
        Map<UUID, Integer> travelSeconds = Map.of(); // cache miss → 이동시간 없음

        Map<UUID, String> times = DayTimeline.compute(ordered, travelSeconds, LocalTime.of(9, 0));

        assertThat(times.get(a)).isEqualTo("09:00");
        assertThat(times.get(b)).isEqualTo("09:00"); // a 소요 0 + 이동 0
    }
}
