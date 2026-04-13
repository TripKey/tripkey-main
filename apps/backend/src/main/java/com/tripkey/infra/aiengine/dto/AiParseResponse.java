package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiParseResponse(
        List<AiPlaceCardDto> cards,
        @JsonProperty("context_summary")
        String contextSummary
) {
}
