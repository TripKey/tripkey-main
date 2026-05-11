package com.tripkey.domain.group;

import com.tripkey.common.exception.InvalidDayParamException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.group.DayViewModel;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DayViewServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @InjectMocks
    private DayViewService dayViewService;

    @Test
    void getDayViewModelThrowsInvalidDayParamWhenDayIsZero() {
        assertThatThrownBy(() -> dayViewService.getDayViewModel(UUID.randomUUID(), 0))
                .isInstanceOf(InvalidDayParamException.class);
    }

    @Test
    void getDayViewModelThrowsInvalidDayParamWhenDayIsNegative() {
        assertThatThrownBy(() -> dayViewService.getDayViewModel(UUID.randomUUID(), -1))
                .isInstanceOf(InvalidDayParamException.class);
    }

    @Test
    void getDayViewModelThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        assertThatThrownBy(() -> dayViewService.getDayViewModel(tripId, 1))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void getDayViewModelReturnsEmptyDayViewWhenNoCardsForDay() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripIdAndDay(tripId, 3)).thenReturn(List.of());

        DayViewModel response = dayViewService.getDayViewModel(tripId, 3);

        assertThat(response.dayId()).isEqualTo("day3");
        assertThat(response.startTimeCard()).isNull();
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards()).isEmpty();
    }

    @Test
    void getDayViewModelAssignsOutboundFlightToStartTimeCard() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard arrivalFlight = flightCard(tripId, "KE723", "outbound", 1, at(8, 0));
        PlaceCard restaurant = nonFlightCard(tripId, "food", 1, at(12, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 1))
                .thenReturn(List.of(restaurant, arrivalFlight));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 1);

        assertThat(response.dayId()).isEqualTo("day1");
        assertThat(response.startTimeCard()).isNotNull();
        assertThat(response.startTimeCard().instanceId()).isEqualTo(arrivalFlight.getInstanceId());
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(restaurant.getInstanceId());
    }

    @Test
    void getDayViewModelAssignsInboundFlightToEndTimeCard() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard hotelCheckout = nonFlightCard(tripId, "accommodation", 5, at(10, 0));
        PlaceCard departureFlight = flightCard(tripId, "KE726", "inbound", 5, at(20, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 5))
                .thenReturn(List.of(hotelCheckout, departureFlight));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 5);

        assertThat(response.dayId()).isEqualTo("day5");
        assertThat(response.startTimeCard()).isNull();
        assertThat(response.endTimeCard()).isNotNull();
        assertThat(response.endTimeCard().instanceId()).isEqualTo(departureFlight.getInstanceId());
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(hotelCheckout.getInstanceId());
    }

    @Test
    void getDayViewModelAssignsBothFlightsForSingleDayTrip() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 단일 day 여행 — outbound / inbound 가 같은 day=1 에 배치되어도 flight_role 로 정확히 분배.
        PlaceCard arrivalFlight = flightCard(tripId, "KE723", "outbound", 1, at(8, 0));
        PlaceCard lunch = nonFlightCard(tripId, "food", 1, at(12, 0));
        PlaceCard departureFlight = flightCard(tripId, "KE726", "inbound", 1, at(20, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 1))
                .thenReturn(List.of(arrivalFlight, lunch, departureFlight));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 1);

        assertThat(response.startTimeCard()).isNotNull();
        assertThat(response.startTimeCard().instanceId()).isEqualTo(arrivalFlight.getInstanceId());
        assertThat(response.endTimeCard()).isNotNull();
        assertThat(response.endTimeCard().instanceId()).isEqualTo(departureFlight.getInstanceId());
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(lunch.getInstanceId());
    }

    @Test
    void getDayViewModelAssignsFlightToSlotRegardlessOfDayNumber() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 사용자가 outbound 항공편을 day=3 에 배치한 케이스 — flight_role 만으로 슬롯 결정.
        PlaceCard misplacedFlight = flightCard(tripId, "KE703", "outbound", 3, at(9, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 3))
                .thenReturn(List.of(misplacedFlight));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 3);

        assertThat(response.startTimeCard()).isNotNull();
        assertThat(response.startTimeCard().instanceId()).isEqualTo(misplacedFlight.getInstanceId());
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards()).isEmpty();
    }

    @Test
    void getDayViewModelKeepsMiddleDayFlightWithoutRoleInCardsArray() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 환승편 — flight_number 는 있지만 flight_role 이 null → cards[] 로 유지
        PlaceCard middleFlight = flightCard(tripId, "JL101", null, 3, at(14, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 3))
                .thenReturn(List.of(middleFlight));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 3);

        assertThat(response.startTimeCard()).isNull();
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(middleFlight.getInstanceId());
    }

    @Test
    void getDayViewModelTreatsTransportWithoutFlightRoleAsRegularCard() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 일반 transport — 지하철 / 버스 등. flight_role null
        PlaceCard subway = nonFlightCard(tripId, "transport", 1, at(9, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 1))
                .thenReturn(List.of(subway));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 1);

        assertThat(response.startTimeCard()).isNull();
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(subway.getInstanceId());
    }

    @Test
    void getDayViewModelKeepsExtraOutboundFlightsInCardsArray() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 같은 day 에 outbound 카드 2장 — createdAt ASC 정렬에 따라 첫 카드만 슬롯, 나머지는 cards[]
        PlaceCard firstOutbound = flightCard(tripId, "KE703", "outbound", 1, at(8, 0));
        PlaceCard duplicateOutbound = flightCard(tripId, "KE705", "outbound", 1, at(10, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 1))
                .thenReturn(List.of(firstOutbound, duplicateOutbound));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 1);

        assertThat(response.startTimeCard()).isNotNull();
        assertThat(response.startTimeCard().instanceId()).isEqualTo(firstOutbound.getInstanceId());
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(duplicateOutbound.getInstanceId());
    }

    @Test
    void getDayViewModelSortsCardsByCreatedAtAsc() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard later = nonFlightCard(tripId, "place", 2, at(14, 0));
        PlaceCard earlier = nonFlightCard(tripId, "place", 2, at(10, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 2))
                .thenReturn(List.of(later, earlier));

        DayViewModel response = dayViewService.getDayViewModel(tripId, 2);

        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(earlier.getInstanceId(), later.getInstanceId());
    }

    private PlaceCard flightCard(UUID tripId, String flightNumber, String flightRole, int day, OffsetDateTime createdAt) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 항공편", "transport", null, null, null, null, null, null, flightNumber
        );
        setField(card, "instanceId", UUID.randomUUID());
        setField(card, "day", day);
        setField(card, "createdAt", createdAt);
        setField(card, "flightRole", flightRole);
        return card;
    }

    private PlaceCard nonFlightCard(UUID tripId, String category, int day, OffsetDateTime createdAt) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 카드", category, null, null, null, null, null, null, null
        );
        setField(card, "instanceId", UUID.randomUUID());
        setField(card, "day", day);
        setField(card, "createdAt", createdAt);
        return card;
    }

    private static OffsetDateTime at(int hour, int minute) {
        return OffsetDateTime.of(2026, 5, 7, hour, minute, 0, 0, ZoneOffset.UTC);
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
