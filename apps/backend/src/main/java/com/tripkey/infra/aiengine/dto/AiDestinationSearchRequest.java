package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiDestinationSearchRequest(
        @JsonProperty("query") String query
) {
}
