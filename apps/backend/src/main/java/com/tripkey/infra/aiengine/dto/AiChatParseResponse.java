package com.tripkey.infra.aiengine.dto;

import com.tripkey.dto.chat.ChatContextDto;

import java.util.List;

public record AiChatParseResponse(
        String intent,
        String reply,
        ChatContextDto updatedContext,
        List<AiPlaceCardDto> cards,
        List<Duplicate> duplicates
) {
    public record Duplicate(String name, String reason) {
    }
}
