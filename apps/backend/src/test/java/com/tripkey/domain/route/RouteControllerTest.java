package com.tripkey.domain.route;

import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.dto.placement.RouteLegsResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.lenient;

@ExtendWith(MockitoExtension.class)
class RouteControllerTest {

    @Mock
    private RouteService routeService;

    @InjectMocks
    private RouteController routeController;

    @Test
    void getRouteLegsReturns200WithWrappedCachedLegs() {
        UUID tripId = UUID.randomUUID();
        RouteLeg leg = new RouteLeg(
                1, UUID.randomUUID(), UUID.randomUUID(), 900, 3000, "walking", "google");
        lenient().when(routeService.readCachedLegs(tripId)).thenReturn(List.of(leg));

        ResponseEntity<RouteLegsResponse> response = routeController.getRouteLegs(tripId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().routeLegs()).containsExactly(leg);
    }
}
