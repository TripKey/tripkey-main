package com.tripkey.dto.chat;

import com.tripkey.dto.card.CardDto;

import java.util.List;

public record ChatCardSaveResponse(
        List<CardDto> createdCards,
        List<ChatDuplicateDto> duplicates
) {
}
