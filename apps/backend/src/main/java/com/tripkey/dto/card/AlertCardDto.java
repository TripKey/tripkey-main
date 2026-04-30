package com.tripkey.dto.card;

import java.util.List;
import java.util.UUID;

public record AlertCardDto(
        String id,
        String type,
        String category,
        String scope,
        Integer day,
        String message,
        List<UUID> relatedInstanceIds
) {
}
