package com.tripkey.domain.optimize;

import com.tripkey.dto.optimize.OptimizeResponse;
import com.tripkey.dto.optimize.SuggestedItineraryResponse;
import com.tripkey.dto.optimize.SuggestedItineraryRequest;
import org.springframework.web.bind.annotation.RequestBody;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/optimize")
@RequiredArgsConstructor
public class OptimizeController {

    private final OptimizeService optimizeService;
    private final SuggestedItineraryService suggestedItineraryService;

    @PostMapping
    public ResponseEntity<OptimizeResponse> optimize(@PathVariable UUID tripId) {
        return ResponseEntity.ok(optimizeService.optimize(tripId));
    }

    @PostMapping("/suggest-itinerary")
    public ResponseEntity<SuggestedItineraryResponse> suggestItinerary(
            @PathVariable UUID tripId, @RequestBody(required = false) SuggestedItineraryRequest request) {
        SuggestedItineraryRequest normalized = request == null
                ? new SuggestedItineraryRequest(null, null).normalized()
                : request.normalized();
        return ResponseEntity.ok(suggestedItineraryService.suggest(tripId, normalized));
    }
}
