package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiOptimizeOrderRequest(
        List<Stop> stops,
        @JsonProperty("start_instance_id") String startInstanceId,
        @JsonProperty("end_instance_id") String endInstanceId
) {

    public record Coord(double lat, double lng) {}

    public record Stop(
            @JsonProperty("instance_id") String instanceId,
            Coord coordinates
    ) {}
}
