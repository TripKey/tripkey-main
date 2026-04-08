package com.tripkey.dto.dump;

import java.util.UUID;

public record DumpStatusResponse(
        UUID jobId,
        String status,
        Short step,
        String errorCode
) {
}
