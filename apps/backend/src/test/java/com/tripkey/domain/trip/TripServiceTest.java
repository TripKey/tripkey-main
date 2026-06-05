package com.tripkey.domain.trip;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.dto.trip.TripCreateRequest;
import com.tripkey.dto.trip.TripDetailResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private TripDestinationRepository tripDestinationRepository;

    @InjectMocks
    private TripService tripService;

    private static void setField(Object target, String name, Object value) {
        try {
            Field f = target.getClass().getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    private Trip trip(UUID id, short days, short companions, OffsetDateTime confirmedAt,
                      OffsetDateTime createdAt, LocalDate startDate) {
        Trip t = new Trip(days, companions, startDate);
        setField(t, "tripId", id);
        setField(t, "confirmedAt", confirmedAt);
        setField(t, "createdAt", createdAt);
        return t;
    }

    // TripDestination constructor takes (Trip, String, Short) — cast int literals to Short
    private TripDestination destination(Trip trip, String name, int sortOrder) {
        return new TripDestination(trip, name, (short) sortOrder);
    }

    @Test
    void getTripDetailMapsTripAndOrderedDestinations() {
        UUID id = UUID.randomUUID();
        OffsetDateTime created = OffsetDateTime.parse("2026-05-31T10:00:00+09:00");
        Trip t = trip(id, (short) 5, (short) 2, null, created, LocalDate.parse("2026-05-10"));
        when(tripRepository.findById(id)).thenReturn(Optional.of(t));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(id)).thenReturn(List.of(
                destination(t, "교토", 0),
                destination(t, "오사카", 1)
        ));

        TripDetailResponse response = tripService.getTripDetail(id);

        assertThat(response.tripId()).isEqualTo(id);
        assertThat(response.travelDays()).isEqualTo((short) 5);
        assertThat(response.companionCount()).isEqualTo((short) 2);
        assertThat(response.destinations()).containsExactly("교토", "오사카");
        assertThat(response.confirmed()).isFalse();
        assertThat(response.createdAt()).isEqualTo(created);
        assertThat(response.startDate()).isEqualTo(LocalDate.parse("2026-05-10"));
    }

    @Test
    void getTripDetailMarksConfirmedWhenConfirmedAtPresent() {
        UUID id = UUID.randomUUID();
        Trip t = trip(id, (short) 3, (short) 1,
                OffsetDateTime.parse("2026-05-31T12:00:00+09:00"),
                OffsetDateTime.parse("2026-05-31T10:00:00+09:00"), null);
        when(tripRepository.findById(id)).thenReturn(Optional.of(t));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(id)).thenReturn(List.of());

        TripDetailResponse response = tripService.getTripDetail(id);

        assertThat(response.confirmed()).isTrue();
        assertThat(response.destinations()).isEmpty();
        assertThat(response.startDate()).isNull();
    }

    @Test
    void getTripDetailThrowsWhenTripMissing() {
        UUID id = UUID.randomUUID();
        when(tripRepository.findById(id)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tripService.getTripDetail(id))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void createPersistsStartDate() {
        LocalDate start = LocalDate.parse("2026-05-10");
        TripCreateRequest request = new TripCreateRequest(
                List.of("교토"), (short) 5, (short) 2, start);
        when(tripRepository.save(org.mockito.ArgumentMatchers.any(Trip.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        tripService.create(request);

        ArgumentCaptor<Trip> captor = ArgumentCaptor.forClass(Trip.class);
        org.mockito.Mockito.verify(tripRepository).save(captor.capture());
        assertThat(captor.getValue().getStartDate()).isEqualTo(start);
    }
}
