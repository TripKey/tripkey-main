package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiRouteResponse(List<Leg> legs) {

    public record Leg(
            @JsonProperty("from_instance_id") String fromInstanceId,
            @JsonProperty("to_instance_id") String toInstanceId,
            @JsonProperty("duration_seconds") int durationSeconds,
            @JsonProperty("distance_meters") int distanceMeters,
            String mode,
            String source
    ) {}
}
