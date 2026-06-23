package com.tripkey.domain.verify;

import com.tripkey.dto.placement.PlacementSaveRequest;
import com.tripkey.dto.placement.PlacementSaveResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/verify")
@RequiredArgsConstructor
public class VerifyController {

    private final VerifyService verifyService;

    @PostMapping
    public ResponseEntity<PlacementSaveResponse> verifyAndSave(
            @PathVariable UUID tripId,
            @Valid @RequestBody PlacementSaveRequest request) {
        return ResponseEntity.ok(verifyService.verifyAndSave(tripId, request));
    }
}
