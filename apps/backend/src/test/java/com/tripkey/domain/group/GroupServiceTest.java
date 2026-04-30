package com.tripkey.domain.group;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.group.Groups03Response;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
}
