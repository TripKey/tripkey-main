package com.tripkey.domain.trip;

import com.tripkey.dto.trip.DestinationSearchResponse;
import com.tripkey.dto.trip.TripCreateRequest;
import com.tripkey.dto.trip.TripCreateResponse;
import com.tripkey.dto.trip.TripDetailResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/trips")
@RequiredArgsConstructor
public class TripController {

    private final TripService tripService;

    @GetMapping("/destinations/search")
    public ResponseEntity<DestinationSearchResponse> searchDestinations(@RequestParam String q) {
        DestinationSearchResponse response = tripService.searchDestinations(q);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<TripCreateResponse> create(@Valid @RequestBody TripCreateRequest request) {
        TripCreateResponse response = tripService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{tripId}")
    public ResponseEntity<TripDetailResponse> getTrip(@PathVariable UUID tripId) {
        return ResponseEntity.ok(tripService.getTripDetail(tripId));
    }
}
