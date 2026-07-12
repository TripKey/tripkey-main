package com.tripkey.domain.verify;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.route.RouteService;
import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.dto.placement.RouteWarning;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RouteValidatorTest {

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private RouteService routeService;

    @InjectMocks
    private RouteValidator routeValidator;

    @BeforeEach
    void setUp() {
        // 기본: 캐시된 leg 없음 → 이동시간 0, 거리 conflict 는 직선거리 폴백
        lenient().when(routeService.readCachedLegs(any())).thenReturn(List.of());
    }

    @Test
    void validateReturnsEmptyWhenNoData() {
        UUID tripId = UUID.randomUUID();
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        assertThat(routeValidator.validate(tripId)).isEmpty();
    }

    @Test
    void distanceWarningEmittedWhenAdjacentDistanceExceedsThreshold() {
        UUID tripId = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(placeCardRepository.findAdjacentCardDistances(tripId))
                .thenReturn(List.<Object[]>of(new Object[]{a, b, 2, 11_500.0}));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        List<RouteWarning> warnings = routeValidator.validate(tripId);

        assertThat(warnings).hasSize(1);
        RouteWarning w = warnings.get(0);
        assertThat(w.type()).isEqualTo("distance");
        assertThat(w.day()).isEqualTo(2);
        assertThat(w.instanceIds()).containsExactly(a, b);
        assertThat(w.distanceMeters()).isEqualTo(11_500);
        assertThat(w.totalMinutes()).isNull();
    }

    @Test
    void distanceWarningSuppressedWhenAtOrBelowThreshold() {
        UUID tripId = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(placeCardRepository.findAdjacentCardDistances(tripId))
                .thenReturn(List.<Object[]>of(new Object[]{a, b, 1, 10_000.0}));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        assertThat(routeValidator.validate(tripId)).isEmpty();
    }

    @Test
    void distanceWarningRoundsMetersToInt() {
        UUID tripId = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(placeCardRepository.findAdjacentCardDistances(tripId))
                .thenReturn(List.<Object[]>of(new Object[]{a, b, 1, 12345.678}));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        assertThat(routeValidator.validate(tripId).get(0).distanceMeters()).isEqualTo(12346);
    }

    @Test
    void durationWarningEmittedWhenDailySumExceedsThreshold() {
        UUID tripId = UUID.randomUUID();
        PlaceCard c1 = placeCard(tripId, "place", 1, (short) 400);
        PlaceCard c2 = placeCard(tripId, "place", 1, (short) 250);
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(c1, c2));

        List<RouteWarning> warnings = routeValidator.validate(tripId);

        assertThat(warnings).hasSize(1);
        RouteWarning w = warnings.get(0);
        assertThat(w.type()).isEqualTo("duration");
        assertThat(w.day()).isEqualTo(1);
        assertThat(w.totalMinutes()).isEqualTo(650);
        assertThat(w.distanceMeters()).isNull();
        assertThat(w.instanceIds()).containsExactlyInAnyOrder(c1.getInstanceId(), c2.getInstanceId());
    }

    @Test
    void durationWarningSuppressedWhenAtThreshold() {
        UUID tripId = UUID.randomUUID();
        PlaceCard c1 = placeCard(tripId, "place", 1, (short) 600);
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(c1));

        assertThat(routeValidator.validate(tripId)).isEmpty();
    }

    @Test
    void durationExcludesAccommodationCardsFromSum() {
        UUID tripId = UUID.randomUUID();
        PlaceCard activity = placeCard(tripId, "place", 1, (short) 500);
        PlaceCard accommodation = placeCard(tripId, "accommodation", 1, (short) 480);
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(activity, accommodation));

        // 500 alone <= 600 → no warning
        assertThat(routeValidator.validate(tripId)).isEmpty();
    }

    @Test
    void durationExcludesIsExcludedCards() {
        UUID tripId = UUID.randomUUID();
        PlaceCard included = placeCard(tripId, "place", 1, (short) 400);
        PlaceCard excluded = placeCard(tripId, "place", 1, (short) 300);
        setField(excluded, "isExcluded", true);
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(included, excluded));

        // 400 alone <= 600 → no warning (excluded 카드 빠짐)
        assertThat(routeValidator.validate(tripId)).isEmpty();
    }

    @Test
    void durationExcludesUnplacedCards() {
        UUID tripId = UUID.randomUUID();
        PlaceCard placed = placeCard(tripId, "place", 1, (short) 400);
        PlaceCard unplaced = placeCard(tripId, "place", null, (short) 300);
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(placed, unplaced));

        assertThat(routeValidator.validate(tripId)).isEmpty();
    }

    @Test
    void durationWarningCalculatesPerDay() {
        UUID tripId = UUID.randomUUID();
        PlaceCard d1Card = placeCard(tripId, "place", 1, (short) 700);
        PlaceCard d2Card = placeCard(tripId, "place", 2, (short) 700);
        PlaceCard d3Card = placeCard(tripId, "place", 3, (short) 300);
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(d1Card, d2Card, d3Card));

        List<RouteWarning> warnings = routeValidator.validate(tripId);

        assertThat(warnings).hasSize(2);
        assertThat(warnings).extracting(RouteWarning::day).containsExactly(1, 2);
    }

    @Test
    void durationTreatsNullEstimatedAsZero() {
        UUID tripId = UUID.randomUUID();
        PlaceCard nullDuration = placeCard(tripId, "place", 1, null);
        PlaceCard normal = placeCard(tripId, "place", 1, (short) 700);
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(nullDuration, normal));

        List<RouteWarning> warnings = routeValidator.validate(tripId);

        assertThat(warnings).hasSize(1);
        assertThat(warnings.get(0).totalMinutes()).isEqualTo(700);
    }

    @Test
    void validateReturnsBothDistanceAndDurationWarnings() {
        UUID tripId = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        PlaceCard busy = placeCard(tripId, "place", 1, (short) 700);
        when(placeCardRepository.findAdjacentCardDistances(tripId))
                .thenReturn(List.<Object[]>of(new Object[]{a, b, 2, 15_000.0}));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(busy));

        List<RouteWarning> warnings = routeValidator.validate(tripId);

        assertThat(warnings).hasSize(2);
        assertThat(warnings).extracting(RouteWarning::type)
                .containsExactlyInAnyOrder("distance", "duration");
    }

    @Test
    void durationIncludesTravelTimeFromCachedLegs() {
        UUID tripId = UUID.randomUUID();
        PlaceCard c1 = placeCard(tripId, "place", 1, (short) 300);
        PlaceCard c2 = placeCard(tripId, "place", 1, (short) 300);
        // 체류 600분(임계 600 동일 → 단독이면 미경고). 이동 60분 더해 660 > 600 → 경고.
        when(placeCardRepository.findAdjacentCardDistances(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(c1, c2));
        when(routeService.readCachedLegs(tripId)).thenReturn(List.of(
                new RouteLeg(1, c1.getInstanceId(), c2.getInstanceId(), 3600, 5_000, "driving", "google")));

        List<RouteWarning> warnings = routeValidator.validate(tripId);

        assertThat(warnings).hasSize(1);
        RouteWarning w = warnings.get(0);
        assertThat(w.type()).isEqualTo("duration");
        assertThat(w.totalMinutes()).isEqualTo(660); // 600 체류 + 60 이동
    }

    @Test
    void distanceUsesRealLegDistanceOverStraightLine() {
        UUID tripId = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        // 직선거리 5km(임계 이하)지만 실제 이동거리 12km(임계 초과) → 경고
        when(placeCardRepository.findAdjacentCardDistances(tripId))
                .thenReturn(List.<Object[]>of(new Object[]{a, b, 1, 5_000.0}));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(routeService.readCachedLegs(tripId)).thenReturn(List.of(
                new RouteLeg(1, a, b, 1500, 12_000, "driving", "google")));

        List<RouteWarning> warnings = routeValidator.validate(tripId);

        assertThat(warnings).hasSize(1);
        RouteWarning w = warnings.get(0);
        assertThat(w.type()).isEqualTo("distance");
        assertThat(w.distanceMeters()).isEqualTo(12_000);
    }

    private PlaceCard placeCard(UUID tripId, String category, Integer day, Short estimatedDurationMin) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 카드", category, null, estimatedDurationMin, null, null, null, null, null
        );
        setField(card, "instanceId", UUID.randomUUID());
        if (day != null) {
            setField(card, "day", day);
        }
        return card;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field field = PlaceCard.class.getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
