package com.tripkey.dto.chat;

import java.util.List;

public record ChatParseResponse(
        String intent,
        String reply,
        ChatContextDto updatedContext,
        List<ChatSuggestedCardDto> suggestedCards,
        List<ChatDuplicateDto> duplicates
) {
}
