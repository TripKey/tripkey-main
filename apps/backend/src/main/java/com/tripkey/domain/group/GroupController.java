package com.tripkey.domain.group;

import com.tripkey.common.exception.InvalidViewParamException;
import com.tripkey.dto.group.Groups03Response;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    public ResponseEntity<Groups03Response> getGroups(
            @PathVariable UUID tripId,
            @RequestParam("view") String view) {

        if (!"03".equals(view)) {
            throw new InvalidViewParamException();
        }
        return ResponseEntity.ok(groupService.getGroups03(tripId));
    }
}
