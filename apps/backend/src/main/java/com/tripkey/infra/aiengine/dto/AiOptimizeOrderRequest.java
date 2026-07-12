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
            Coord coordinates,
            boolean pinned,
            @JsonProperty("reserved_time") String reservedTime,
            @JsonProperty("duration_min") Integer durationMin,
            // 해당 Day 요일의 영업시간 [open, close] "HH:MM" — 없으면 null(제약 없음) (#292)
            @JsonProperty("open_time") String openTime,
            @JsonProperty("close_time") String closeTime
    ) {}
}
