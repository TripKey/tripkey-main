package com.tripkey.domain.chat;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.dto.chat.ChatDuplicateDto;

import java.util.List;

public record ChatCardWriteResult(
        List<PlaceCard> savedCards,
        List<ChatDuplicateDto> duplicates
) {
}
