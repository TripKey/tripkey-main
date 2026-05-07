package com.tripkey.domain.group;

import com.tripkey.dto.group.DayViewModel;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/days")
@RequiredArgsConstructor
public class DayController {

    private final DayViewService dayViewService;

    @GetMapping("/{dayNumber}")
    public ResponseEntity<DayViewModel> getDayViewModel(
            @PathVariable UUID tripId,
            @PathVariable int dayNumber) {
        return ResponseEntity.ok(dayViewService.getDayViewModel(tripId, dayNumber));
    }
}
