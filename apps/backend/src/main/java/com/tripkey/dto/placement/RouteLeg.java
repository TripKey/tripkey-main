package com.tripkey.dto.placement;

import java.util.UUID;

public record RouteLeg(
        Integer day,
        UUID fromInstanceId,
        UUID toInstanceId,
        Integer durationSeconds,
        Integer distanceMeters,
        String mode,
        String source
) {
}
