package com.tripkey.dto.chat;

public record ChatParseRequest(
        String message,
        ChatContextDto context,
        Integer maxCards
) {
}
