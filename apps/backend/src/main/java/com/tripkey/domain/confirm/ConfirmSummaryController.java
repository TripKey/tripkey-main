package com.tripkey.domain.confirm;

import com.tripkey.dto.confirm.ConfirmSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/confirm-summary")
@RequiredArgsConstructor
public class ConfirmSummaryController {

    private final ConfirmSummaryService confirmSummaryService;

    @GetMapping
    public ResponseEntity<ConfirmSummaryResponse> getConfirmSummary(@PathVariable UUID tripId) {
        return ResponseEntity.ok(confirmSummaryService.getConfirmSummary(tripId));
    }
}
