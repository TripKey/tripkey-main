package com.tripkey.domain.chat;

import com.tripkey.dto.chat.ChatCardSaveRequest;
import com.tripkey.dto.chat.ChatCardSaveResponse;
import com.tripkey.dto.chat.ChatParseRequest;
import com.tripkey.dto.chat.ChatParseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/chat")
@RequiredArgsConstructor
public class ChatParseController {

    private final ChatParseService chatParseService;

    @PostMapping("/parse")
    public ResponseEntity<ChatParseResponse> parse(
            @PathVariable UUID tripId,
            @RequestBody ChatParseRequest request
    ) {
        return ResponseEntity.ok(chatParseService.parse(tripId, request));
    }

    @PostMapping("/cards")
    public ResponseEntity<ChatCardSaveResponse> saveCards(
            @PathVariable UUID tripId,
            @RequestBody ChatCardSaveRequest request
    ) {
        return ResponseEntity.ok(chatParseService.saveCards(tripId, request));
    }
}
