package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.tripkey.dto.chat.ChatContextDto;

import java.util.List;
import java.util.UUID;

public record AiChatParseRequest(
        @JsonProperty("trip_id")
        UUID tripId,
        String message,
        List<String> destinations,
        @JsonProperty("travel_days")
        Short travelDays,
        @JsonProperty("companion_count")
        Short companionCount,
        ChatContextDto context,
        @JsonProperty("existing_cards")
        List<ExistingCard> existingCards,
        @JsonProperty("max_cards")
        Integer maxCards
) {
    public record ExistingCard(
            String name,
            String category,
            String location,
            @JsonProperty("place_id")
            String placeId
    ) {
    }
}
