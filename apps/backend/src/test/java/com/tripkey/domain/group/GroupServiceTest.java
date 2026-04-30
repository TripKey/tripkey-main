package com.tripkey.domain.group;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.group.Groups03Response;
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
class GroupServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @InjectMocks
    private GroupService groupService;

    @Test
    void getGroups03ThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        assertThatThrownBy(() -> groupService.getGroups03(tripId))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void getGroups03ReturnsAllEmptyGroupsWhenNoCards() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        Groups03Response response = groupService.getGroups03(tripId);

        assertThat(response.view()).isEqualTo("03");
        assertThat(response.inputRequired()).isEmpty();
        assertThat(response.selectRequired()).isEmpty();
        assertThat(response.fixRequired()).isEmpty();
        assertThat(response.reviewOnly()).isEmpty();
        assertThat(response.excluded()).isEmpty();
    }

    @Test
    void getGroups03DistributesCardsByActionType() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard inputCard = cardWith(tripId, "input_required", false, at(10, 0));
        PlaceCard selectCard = cardWith(tripId, "select_required", false, at(10, 1));
        PlaceCard fixCard = cardWith(tripId, "fix_required", false, at(10, 2));
        PlaceCard reviewCard = cardWith(tripId, "review_only", false, at(10, 3));

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(reviewCard, fixCard, selectCard, inputCard));

        Groups03Response response = groupService.getGroups03(tripId);

        assertThat(response.inputRequired()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(inputCard.getInstanceId());
        assertThat(response.selectRequired()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(selectCard.getInstanceId());
        assertThat(response.fixRequired()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(fixCard.getInstanceId());
        assertThat(response.reviewOnly()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(reviewCard.getInstanceId());
        assertThat(response.excluded()).isEmpty();
    }

    private PlaceCard cardWith(UUID tripId, String actionType, boolean excluded, OffsetDateTime createdAt) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 카드", "place", null, null, null, null, null, null, null
        );
        setField(card, "instanceId", UUID.randomUUID());
        setField(card, "actionType", actionType);
        setField(card, "isExcluded", excluded);
        setField(card, "createdAt", createdAt);
        return card;
    }

    private static OffsetDateTime at(int hour, int minute) {
        return OffsetDateTime.of(2026, 4, 30, hour, minute, 0, 0, ZoneOffset.UTC);
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
