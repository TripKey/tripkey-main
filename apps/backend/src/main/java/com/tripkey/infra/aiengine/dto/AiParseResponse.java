package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;
import java.util.UUID;

public record AiParseResponse(
        List<AiPlaceCardDto> cards,

        @JsonProperty("context_summary")
        String contextSummary,

        @JsonProperty("alert_cards")
        List<AlertCard> alertCards,

        @JsonProperty("parse_version")
        String parseVersion
) {

    public record AlertCard(
            String id,
            String type,
            String category,
            String scope,
            Integer day,
            String message,
            @JsonProperty("related_instance_ids")
            List<UUID> relatedInstanceIds
    ) {
    }
}
