package com.tripkey.infra.aiengine.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public record AiOptimizeOrderResponse(
        @JsonProperty("ordered_instance_ids") List<String> orderedInstanceIds,
        @JsonProperty("total_duration_seconds") int totalDurationSeconds,
        String source
) {}
