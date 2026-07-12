package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tripkey.dto.chat.ChatContextDto;

import java.util.List;

public record AiChatParseResponse(
        String intent,
        String reply,
        @JsonProperty("updated_context")
        ChatContextDto updatedContext,
        List<AiPlaceCardDto> cards,
        List<Duplicate> duplicates
) {
    public record Duplicate(String name, String reason) {
    }
}
