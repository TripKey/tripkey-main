package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record AiParseRequest(
        String text,
        String destination,
        @JsonProperty("travel_days")
        Short travelDays
) {
}
