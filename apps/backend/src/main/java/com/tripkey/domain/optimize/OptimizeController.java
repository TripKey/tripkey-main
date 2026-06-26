package com.tripkey.domain.optimize;

import com.tripkey.dto.optimize.OptimizeResponse;
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

    @PostMapping
    public ResponseEntity<OptimizeResponse> optimize(@PathVariable UUID tripId) {
        return ResponseEntity.ok(optimizeService.optimize(tripId));
    }
}
