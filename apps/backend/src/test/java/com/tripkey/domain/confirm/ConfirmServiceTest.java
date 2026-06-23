package com.tripkey.domain.confirm;

import com.tripkey.common.exception.ConfirmAllExcludedException;
import com.tripkey.common.exception.ConfirmEmptyDaysException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.domain.verify.VerifyService;
import com.tripkey.dto.placement.PlacementDay;
import com.tripkey.dto.placement.PlacementDayItem;
import com.tripkey.dto.placement.PlacementSaveRequest;
import com.tripkey.dto.placement.PlacementSaveResponse;
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
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfirmServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private VerifyService verifyService;

    @Mock
    private ConfirmSummaryService confirmSummaryService;

    @InjectMocks
    private ConfirmService confirmService;

    @BeforeEach
    void stubVerifyServiceDefaultResponse() {
        lenient().when(verifyService.verifyAndSave(any(), any()))
                .thenAnswer(invocation -> PlacementSaveResponse.of(invocation.getArgument(0)));
    }

    @Test
    void confirmAndSaveThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.findById(tripId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> confirmService.confirmAndSave(tripId, new PlacementSaveRequest(List.of())))
                .isInstanceOf(TripNotFoundException.class);
        verify(verifyService, never()).verifyAndSave(any(), any());
    }

    @Test
    void confirmAndSaveThrowsConfirmEmptyDaysWhenDaysIsEmpty() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        assertThatThrownBy(() -> confirmService.confirmAndSave(tripId, new PlacementSaveRequest(List.of())))
                .isInstanceOf(ConfirmEmptyDaysException.class);
        verify(verifyService, never()).verifyAndSave(any(), any());
        assertThat(trip.getConfirmedAt()).isNull();
    }

    @Test
    void confirmAndSaveThrowsConfirmEmptyDaysWhenAllDaysHaveNoCards() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of()),
                new PlacementDay(2, List.of())
        ));

        assertThatThrownBy(() -> confirmService.confirmAndSave(tripId, request))
                .isInstanceOf(ConfirmEmptyDaysException.class);
        verify(verifyService, never()).verifyAndSave(any(), any());
    }

    @Test
    void confirmAndSaveThrowsConfirmAllExcludedWhenEveryPlacedCardIsExcluded() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        PlaceCard excludedA = placeCard(tripId);
        PlaceCard excludedB = placeCard(tripId);
        setField(excludedA, "isExcluded", true);
        setField(excludedB, "isExcluded", true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(excludedA, excludedB));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(excludedA.getInstanceId(), 1, null),
                        new PlacementDayItem(excludedB.getInstanceId(), 2, null)
                ))
        ));

        assertThatThrownBy(() -> confirmService.confirmAndSave(tripId, request))
                .isInstanceOf(ConfirmAllExcludedException.class);
        verify(verifyService, never()).verifyAndSave(any(), any());
        assertThat(trip.getConfirmedAt()).isNull();
    }

    @Test
    void confirmAndSavePassesWhenAtLeastOnePlacedCardIsIncluded() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        PlaceCard included = placeCard(tripId);
        PlaceCard excluded = placeCard(tripId);
        setField(excluded, "isExcluded", true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(included, excluded));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(included.getInstanceId(), 1, null),
                        new PlacementDayItem(excluded.getInstanceId(), 2, null)
                ))
        ));

        PlacementSaveResponse response = confirmService.confirmAndSave(tripId, request);

        assertThat(response.saved()).isTrue();
        assertThat(response.tripId()).isEqualTo(tripId);
        assertThat(trip.getConfirmedAt()).isNotNull();
        verify(verifyService).verifyAndSave(eq(tripId), eq(request));
        verify(confirmSummaryService).generateRuleBasedSummary(eq(tripId), any(), any());
    }

    @Test
    void confirmAndSaveDelegatesSaveToVerifyServiceAndSetsConfirmedAt() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        PlaceCard card = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(card));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(2, List.of(
                        new PlacementDayItem(card.getInstanceId(), 1, 60)
                ))
        ));

        PlacementSaveResponse response = confirmService.confirmAndSave(tripId, request);

        assertThat(response.saved()).isTrue();
        assertThat(trip.getConfirmedAt()).isNotNull();
        verify(verifyService).verifyAndSave(tripId, request);
        verify(confirmSummaryService).generateRuleBasedSummary(eq(tripId), any(), any());
    }

    @Test
    void confirmAndSaveIsIdempotent() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        PlaceCard card = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(card));

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(card.getInstanceId(), 1, null)
                ))
        ));

        PlacementSaveResponse first = confirmService.confirmAndSave(tripId, request);
        PlacementSaveResponse second = confirmService.confirmAndSave(tripId, request);

        assertThat(first.saved()).isTrue();
        assertThat(second.saved()).isTrue();
        assertThat(trip.getConfirmedAt()).isNotNull();
        verify(verifyService, times(2)).verifyAndSave(tripId, request);
        verify(confirmSummaryService, times(2)).generateRuleBasedSummary(eq(tripId), any(), any());
    }

    @Test
    void confirmAndSavePassesThroughVerifyServiceRouteWarnings() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        PlaceCard card = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(card));

        RouteWarning warning = RouteWarning.distance(
                1, UUID.randomUUID(), UUID.randomUUID(), 12_000
        );
        UUID stale = UUID.randomUUID();
        when(verifyService.verifyAndSave(eq(tripId), any())).thenReturn(
                PlacementSaveResponse.of(tripId, List.of(stale), List.of(warning))
        );

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(card.getInstanceId(), 1, null)
                ))
        ));

        PlacementSaveResponse response = confirmService.confirmAndSave(tripId, request);

        assertThat(response.skippedInstanceIds()).containsExactly(stale);
        assertThat(response.routeWarnings()).containsExactly(warning);
        verify(confirmSummaryService).generateRuleBasedSummary(eq(tripId), eq(List.of(warning)), any());
    }

    @Test
    void confirmAndSavePassesThroughVerifyServiceRouteLegs() {
        UUID tripId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));

        PlaceCard card = placeCard(tripId);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(card));

        RouteLeg leg = new RouteLeg(
                1, UUID.randomUUID(), UUID.randomUUID(), 2880, 5400, "transit", "google"
        );
        when(verifyService.verifyAndSave(eq(tripId), any())).thenReturn(
                PlacementSaveResponse.of(tripId, List.of(), List.of(), List.of(leg))
        );

        PlacementSaveRequest request = new PlacementSaveRequest(List.of(
                new PlacementDay(1, List.of(
                        new PlacementDayItem(card.getInstanceId(), 1, null)
                ))
        ));

        PlacementSaveResponse response = confirmService.confirmAndSave(tripId, request);

        assertThat(response.routeLegs()).containsExactly(leg);
        verify(confirmSummaryService).generateRuleBasedSummary(eq(tripId), any(), eq(List.of(leg)));
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
