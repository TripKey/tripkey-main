package com.tripkey.domain.group;

import com.tripkey.common.exception.InvalidViewParamException;
import com.tripkey.dto.group.Groups04Response;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;

    @GetMapping
    public ResponseEntity<?> getGroups(
            @PathVariable UUID tripId,
            @RequestParam("view") String view) {

        return switch (view) {
            case "03" -> ResponseEntity.ok(groupService.getGroups03(tripId));
            case "04" -> ResponseEntity.ok(groupService.getGroups04(tripId));
            default -> throw new InvalidViewParamException();
        };
    }

    @PostMapping("/reorder")
    public ResponseEntity<Groups04Response> reorderGroups(@PathVariable UUID tripId) {
        return ResponseEntity.ok(groupService.reorderGroups(tripId));
    }
}
