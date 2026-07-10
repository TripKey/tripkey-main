package com.tripkey.infra.aiengine.dto;

import com.tripkey.dto.chat.ChatContextDto;

import java.util.List;
import java.util.UUID;

public record AiChatParseRequest(
        UUID tripId,
        String message,
        List<String> destinations,
        Short travelDays,
        Short companionCount,
        ChatContextDto context,
        List<ExistingCard> existingCards,
        Integer maxCards
) {
    public record ExistingCard(
            String name,
            String category,
            String location,
            String placeId
    ) {
    }
}
