package com.tripkey.dto.chat;

import java.util.List;

public record ChatCardSaveRequest(
        List<ChatSuggestedCardDto> cards
) {
}
