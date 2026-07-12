package com.tripkey.dto.chat;

import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;

import java.util.UUID;

public record ChatSuggestedCardDto(
        UUID candidateId,
        AiPlaceCardDto card
) {
    public static ChatSuggestedCardDto from(AiPlaceCardDto card) {
        return new ChatSuggestedCardDto(UUID.randomUUID(), card);
    }
}
