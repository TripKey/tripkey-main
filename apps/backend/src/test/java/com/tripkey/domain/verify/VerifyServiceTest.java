package com.tripkey.domain.verify;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.placement.PlacementDay;
import com.tripkey.dto.placement.PlacementDayItem;
import com.tripkey.dto.placement.PlacementSaveRequest;
import com.tripkey.dto.placement.PlacementSaveResponse;
import com.tripkey.dto.placement.RouteWarning;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerifyServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private RouteValidator routeValidator;

    @Mock
    private com.tripkey.domain.route.RouteService routeService;

    @InjectMocks
    private VerifyService verifyService;

    @Test
    void verifyAndSaveThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        PlacementSaveRequest request = new PlacementSaveRequest(List.of());

        assertThatThrownBy(() -> verifyService.verifyAndSave(tripId, request))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void verifyAndSaveReturnsSavedWithEmptyDaysAndNoPlacedCards() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        PlacementSaveResponse response = verifyService.verifyAndSave(tripId, new PlacementSaveRequest(List.of()));

        assertThat(response.saved()).isTrue();
        assertThat(response.tripId()).isEqualTo(tripId);
        assertThat(response.skippedInstanceIds()).isEmpty();
    }

    @Test
    void verifyAndSaveAppliesSingleDayPlacement() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard card = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(card));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(2, List.of(
                        new PlacementDayItem(card.getInstanceId(), 1, 90)
                ))
        ));

        PlacementSaveResponse response = verifyService.verifyAndSave(tripId, request);

        assertThat(response.saved()).isTrue();
        assertThat(response.skippedInstanceIds()).isEmpty();
        assertThat(card.getDay()).isEqualTo(2);
        assertThat(card.getDayOrder()).isEqualTo((short) 1);
        assertThat(card.getEstimatedDurationMin()).isEqualTo((short) 90);
    }

    @Test
    void verifyAndSaveAppliesMultiDayMultiCardPlacement() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard a = placeCard(tripId);
        PlaceCard b = placeCard(tripId);
        PlaceCard c = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(a, b, c));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(a.getInstanceId(), 1, null),
                        new PlacementDayItem(b.getInstanceId(), 2, null)
                )),
                new PlacementDay(2, List.of(
                        new PlacementDayItem(c.getInstanceId(), 1, 60)
                ))
        ));

        verifyService.verifyAndSave(tripId, request);

        assertThat(a.getDay()).isEqualTo(1);
        assertThat(a.getDayOrder()).isEqualTo((short) 1);
        assertThat(b.getDay()).isEqualTo(1);
        assertThat(b.getDayOrder()).isEqualTo((short) 2);
        assertThat(c.getDay()).isEqualTo(2);
        assertThat(c.getDayOrder()).isEqualTo((short) 1);
        assertThat(c.getEstimatedDurationMin()).isEqualTo((short) 60);
    }

    @Test
    void verifyAndSavePreservesExistingEstimatedDurationWhenRequestIsNull() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard card = placeCard(tripId);
        setField(card, "estimatedDurationMin", (short) 120);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(card));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(card.getInstanceId(), 1, null)
                ))
        ));

        verifyService.verifyAndSave(tripId, request);

        assertThat(card.getEstimatedDurationMin()).isEqualTo((short) 120);
    }

    @Test
    void verifyAndSaveReturnsStaleInstanceIdsInSkippedList() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard knownCard = placeCard(tripId);
        UUID staleInstanceId = UUID.randomUUID();
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(knownCard));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(knownCard.getInstanceId(), 1, null),
                        new PlacementDayItem(staleInstanceId, 2, null)
                ))
        ));

        PlacementSaveResponse response = verifyService.verifyAndSave(tripId, request);

        assertThat(response.saved()).isTrue();
        assertThat(response.skippedInstanceIds()).containsExactly(staleInstanceId);
        // 알려진 카드는 정상 갱신, stale 은 무시 (DB 영향 없음)
        assertThat(knownCard.getDay()).isEqualTo(1);
        assertThat(knownCard.getDayOrder()).isEqualTo((short) 1);
    }

    @Test
    void verifyAndSaveClearsCardsNotInRequest() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 사용자가 SCR-04 에서 untouched 카드를 Day 보드에서 빼서 Stock 으로 되돌린 상황 시뮬레이션.
        // 이전엔 day=5, day_order=3 으로 저장돼 있었지만, 이번 verify request 에는 포함되지 않음.
        PlaceCard updated = placeCard(tripId);
        PlaceCard untouched = placeCard(tripId);
        setField(untouched, "day", 5);
        setField(untouched, "dayOrder", (short) 3);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(updated, untouched));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(updated.getInstanceId(), 1, null)
                ))
        ));

        verifyService.verifyAndSave(tripId, request);

        // request 에 포함된 카드는 새 day 로 갱신
        assertThat(updated.getDay()).isEqualTo(1);
        assertThat(updated.getDayOrder()).isEqualTo((short) 1);
        // request 에 없는 카드는 day / day_order 모두 null 로 초기화 (스냅샷 의미론)
        assertThat(untouched.getDay()).isNull();
        assertThat(untouched.getDayOrder()).isNull();
    }

    @Test
    void verifyAndSaveClearsAllPlacedCardsWhenRequestIsEmpty() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 사용자가 모든 카드를 Stock 으로 되돌리고 verify 호출하는 시나리오
        PlaceCard previouslyPlaced = placeCard(tripId);
        setField(previouslyPlaced, "day", 2);
        setField(previouslyPlaced, "dayOrder", (short) 1);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(previouslyPlaced));

        verifyService.verifyAndSave(tripId, new PlacementSaveRequest(List.of()));

        assertThat(previouslyPlaced.getDay()).isNull();
        assertThat(previouslyPlaced.getDayOrder()).isNull();
    }

    @Test
    void verifyAndSaveLeavesUnplacedCardsUntouchedWhenAbsentFromRequest() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 처음부터 미배치(day=null) 인 카드는 request 에 없어도 변경 안 됨 — clearDayPlacement 가 no-op
        PlaceCard updated = placeCard(tripId);
        PlaceCard neverPlaced = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(updated, neverPlaced));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(updated.getInstanceId(), 1, null)
                ))
        ));

        verifyService.verifyAndSave(tripId, request);

        assertThat(updated.getDay()).isEqualTo(1);
        assertThat(neverPlaced.getDay()).isNull();
        assertThat(neverPlaced.getDayOrder()).isNull();
    }

    @Test
    void verifyAndSaveIsIdempotent() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard card = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(card));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(2, List.of(
                        new PlacementDayItem(card.getInstanceId(), 1, 60)
                ))
        ));

        PlacementSaveResponse first = verifyService.verifyAndSave(tripId, request);
        PlacementSaveResponse second = verifyService.verifyAndSave(tripId, request);

        assertThat(first.saved()).isTrue();
        assertThat(second.saved()).isTrue();
        assertThat(card.getDay()).isEqualTo(2);
        assertThat(card.getDayOrder()).isEqualTo((short) 1);
        assertThat(card.getEstimatedDurationMin()).isEqualTo((short) 60);
    }

    @Test
    void verifyAndSaveIncludesRouteWarningsFromValidator() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        RouteWarning warning = RouteWarning.duration(1, List.of(UUID.randomUUID()), 700);
        when(routeValidator.validate(tripId)).thenReturn(List.of(warning));

        PlacementSaveResponse response = verifyService.verifyAndSave(
                tripId, new PlacementSaveRequest(List.of())
        );

        assertThat(response.routeWarnings()).containsExactly(warning);
    }

    @Test
    void verifyAndSaveReturnsEmptyRouteWarningsWhenValidatorReturnsEmpty() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(routeValidator.validate(tripId)).thenReturn(List.of());

        PlacementSaveResponse response = verifyService.verifyAndSave(
                tripId, new PlacementSaveRequest(List.of())
        );

        assertThat(response.routeWarnings()).isEmpty();
    }

    @Test
    void verifySucceedsWhenRouteServiceFails() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        // ai-engine 장애 시뮬레이션: route 계산이 예외를 던져도 저장은 성공해야 한다.
        when(routeService.computeLegs(any())).thenThrow(new IllegalStateException("ai-engine down"));

        PlacementSaveResponse response = verifyService.verifyAndSave(
                tripId, new PlacementSaveRequest(List.of())
        );

        assertThat(response).isNotNull();
        assertThat(response.saved()).isTrue();
        assertThat(response.routeLegs()).isEmpty();
    }

    private PlaceCard placeCard(UUID tripId) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 카드", "place", null, null, null, null, null, null, null
        );
        setField(card, "instanceId", UUID.randomUUID());
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
