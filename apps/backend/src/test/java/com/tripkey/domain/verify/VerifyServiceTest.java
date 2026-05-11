package com.tripkey.domain.verify;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.placement.PlacementDay;
import com.tripkey.dto.placement.PlacementDayItem;
import com.tripkey.dto.placement.PlacementSaveRequest;
import com.tripkey.dto.placement.PlacementSaveResponse;
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
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VerifyServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

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
    void verifyAndSaveReturnsSavedWithEmptyDaysWithoutModifyingCards() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlacementSaveRequest request = new PlacementSaveRequest(List.of());

        PlacementSaveResponse response = verifyService.verifyAndSave(tripId, request);

        assertThat(response.saved()).isTrue();
        assertThat(response.tripId()).isEqualTo(tripId);
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
    void verifyAndSaveSilentlyIgnoresStaleInstanceIdsNotInDb() {
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
        assertThat(knownCard.getDay()).isEqualTo(1);
        assertThat(knownCard.getDayOrder()).isEqualTo((short) 1);
        // stale instance_id 는 DB 에 없으므로 영향 없음 (예외도 안 던짐)
    }

    @Test
    void verifyAndSaveLeavesCardsNotInRequestUnchanged() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

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

        assertThat(updated.getDay()).isEqualTo(1);
        assertThat(untouched.getDay()).isEqualTo(5);
        assertThat(untouched.getDayOrder()).isEqualTo((short) 3);
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
