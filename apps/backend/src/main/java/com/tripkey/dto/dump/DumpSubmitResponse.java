package com.tripkey.dto.dump;

import java.util.UUID;

public record DumpSubmitResponse(
        UUID jobId,
        String status
) {
}
