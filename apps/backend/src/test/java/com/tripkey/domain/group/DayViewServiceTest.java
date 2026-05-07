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
        when(placeCardRepository.findMaxDayByTripId(tripId)).thenReturn(0);

        DayViewModel response = dayViewService.getDayViewModel(tripId, 3);

        assertThat(response.dayId()).isEqualTo("day3");
        assertThat(response.startTimeCard()).isNull();
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards()).isEmpty();
    }

    @Test
    void getDayViewModelAssignsArrivalFlightToStartTimeCardOnDayOne() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard arrivalFlight = dayCard(tripId, "transport", "KE723", 1, at(8, 0));
        PlaceCard restaurant = dayCard(tripId, "food", null, 1, at(12, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 1))
                .thenReturn(List.of(restaurant, arrivalFlight));
        when(placeCardRepository.findMaxDayByTripId(tripId)).thenReturn(5);

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
    void getDayViewModelAssignsDepartureFlightToEndTimeCardOnMaxDay() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard hotelCheckout = dayCard(tripId, "accommodation", null, 5, at(10, 0));
        PlaceCard departureFlight = dayCard(tripId, "transport", "KE726", 5, at(20, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 5))
                .thenReturn(List.of(hotelCheckout, departureFlight));
        when(placeCardRepository.findMaxDayByTripId(tripId)).thenReturn(5);

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

        PlaceCard arrivalFlight = dayCard(tripId, "transport", "KE723", 1, at(8, 0));
        PlaceCard lunch = dayCard(tripId, "food", null, 1, at(12, 0));
        PlaceCard departureFlight = dayCard(tripId, "transport", "KE726", 1, at(20, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 1))
                .thenReturn(List.of(arrivalFlight, lunch, departureFlight));
        when(placeCardRepository.findMaxDayByTripId(tripId)).thenReturn(1);

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
    void getDayViewModelKeepsMiddleDayFlightInCardsArray() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // 3일차 국내선 환승편 — start/end 슬롯에 들어가지 않고 cards[] 에 표시
        PlaceCard middleFlight = dayCard(tripId, "transport", "JL101", 3, at(14, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 3))
                .thenReturn(List.of(middleFlight));
        when(placeCardRepository.findMaxDayByTripId(tripId)).thenReturn(5);

        DayViewModel response = dayViewService.getDayViewModel(tripId, 3);

        assertThat(response.startTimeCard()).isNull();
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(middleFlight.getInstanceId());
    }

    @Test
    void getDayViewModelTreatsTransportWithoutFlightNumberAsRegularCard() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        // transport 카테고리지만 flight_number 없음 (예: 지하철 / 버스)
        PlaceCard subway = dayCard(tripId, "transport", null, 1, at(9, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 1))
                .thenReturn(List.of(subway));
        when(placeCardRepository.findMaxDayByTripId(tripId)).thenReturn(3);

        DayViewModel response = dayViewService.getDayViewModel(tripId, 1);

        assertThat(response.startTimeCard()).isNull();
        assertThat(response.endTimeCard()).isNull();
        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(subway.getInstanceId());
    }

    @Test
    void getDayViewModelSortsCardsByCreatedAtAsc() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard later = dayCard(tripId, "place", null, 2, at(14, 0));
        PlaceCard earlier = dayCard(tripId, "place", null, 2, at(10, 0));

        when(placeCardRepository.findAllByTripIdAndDay(tripId, 2))
                .thenReturn(List.of(later, earlier));
        when(placeCardRepository.findMaxDayByTripId(tripId)).thenReturn(5);

        DayViewModel response = dayViewService.getDayViewModel(tripId, 2);

        assertThat(response.cards())
                .extracting(CardDto::instanceId)
                .containsExactly(earlier.getInstanceId(), later.getInstanceId());
    }

    private PlaceCard dayCard(UUID tripId, String category, String flightNumber, int day, OffsetDateTime createdAt) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 카드", category, null, null, null, null, null, null, flightNumber
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
