package com.tripkey.dto.chat;

import com.tripkey.dto.card.CardDto;

import java.util.List;

public record ChatParseResponse(
        String intent,
        String reply,
        ChatContextDto updatedContext,
        List<CardDto> createdCards,
        List<ChatDuplicateDto> duplicates
) {
}
