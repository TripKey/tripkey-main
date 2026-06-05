package com.tripkey.domain.trip;

import com.tripkey.dto.trip.TripDetailResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TripControllerTest {

    @Mock
    private TripService tripService;

    @InjectMocks
    private TripController tripController;

    @Test
    void getTripReturns200WithBody() {
        UUID id = UUID.randomUUID();
        TripDetailResponse body = new TripDetailResponse(
                id, (short) 5, (short) 2, List.of("교토"), false,
                OffsetDateTime.parse("2026-05-31T10:00:00+09:00"));
        when(tripService.getTripDetail(id)).thenReturn(body);

        ResponseEntity<TripDetailResponse> response = tripController.getTrip(id);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(body);
    }
}
