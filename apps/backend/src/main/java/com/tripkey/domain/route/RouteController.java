package com.tripkey.domain.route;

import com.tripkey.dto.placement.RouteLegsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/route-legs")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @GetMapping
    public ResponseEntity<RouteLegsResponse> getRouteLegs(@PathVariable UUID tripId) {
        return ResponseEntity.ok(new RouteLegsResponse(routeService.readCachedLegs(tripId)));
    }
}
