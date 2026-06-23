package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiRouteRequest(List<Leg> legs) {

    public record Coord(double lat, double lng) {}

    public record Leg(
            @JsonProperty("from_instance_id") String fromInstanceId,
            @JsonProperty("to_instance_id") String toInstanceId,
            Coord origin,
            Coord destination
    ) {}
}
