package com.tripkey.dto.confirm;

import com.fasterxml.jackson.databind.JsonNode;
import com.tripkey.domain.confirm.ConfirmSummary;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ConfirmSummaryResponse(
        UUID tripId,
        String status,
        String generationMode,
        JsonNode summary,
        OffsetDateTime generatedAt
) {
    public static ConfirmSummaryResponse of(ConfirmSummary entity, JsonNode summary) {
        return new ConfirmSummaryResponse(
                entity.getTripId(),
                entity.getStatus(),
                entity.getGenerationMode(),
                summary,
                entity.getGeneratedAt()
        );
    }
}
