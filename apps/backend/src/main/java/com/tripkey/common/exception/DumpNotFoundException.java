package com.tripkey.common.exception;

import java.util.UUID;

public class DumpNotFoundException extends RuntimeException {

    public DumpNotFoundException(UUID tripId, UUID jobId) {
        super("파싱 작업을 찾을 수 없어요. tripId=" + tripId + ", jobId=" + jobId);
    }
}
