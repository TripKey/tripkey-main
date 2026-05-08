package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

public record AiNonBlockingEnrichmentResponse(
        @JsonProperty("card_instance_id")
        UUID cardInstanceId,

        List<Patch> patches,

        @JsonProperty("alert_cards")
        List<AiParseResponse.AlertCard> alertCards
) {

    public record Patch(
            String field,
            Object value,
            @JsonProperty("apply_mode")
            String applyMode,
            String confidence,
            String reason
    ) {
    }
}
