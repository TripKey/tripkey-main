package com.tripkey.dto.dump;

import java.util.UUID;

public record ParseJobStatusResponse(
        UUID jobId,
        String status,
        Short step,
        String errorCode
) {
}
