package com.tripkey.dto.dump;

import java.util.List;
import java.util.UUID;

public record DumpResultResponse(
        List<PlaceCardDto> cards,
        String contextSummary,
        List<AlertCardDto> alertCards
) {

    public record PlaceCardDto(
            UUID instanceId,
            String placeId,
            String status,
            String name,
            String category,
            String classification,
            Short estimatedDurationMin,
            String timeConstraint,
            Boolean isAiGenerated,
            String conflictType,
            String conflictReason,
            List<String> remind,
            CoordinatesDto coordinates
    ) {
    }

    public record CoordinatesDto(
            Double lat,
            Double lng
    ) {
    }

    public record AlertCardDto(
            String type,
            String message,
            List<UUID> relatedInstanceIds
    ) {
    }
}
