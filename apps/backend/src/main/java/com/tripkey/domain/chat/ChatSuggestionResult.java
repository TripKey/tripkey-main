package com.tripkey.domain.chat;

import com.tripkey.dto.chat.ChatDuplicateDto;
import com.tripkey.dto.chat.ChatSuggestedCardDto;

import java.util.List;

public record ChatSuggestionResult(
        List<ChatSuggestedCardDto> suggestions,
        List<ChatDuplicateDto> duplicates
) {
}
