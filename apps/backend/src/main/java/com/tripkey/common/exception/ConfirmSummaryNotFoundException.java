package com.tripkey.common.exception;

import java.util.UUID;

public class ConfirmSummaryNotFoundException extends RuntimeException {

    public ConfirmSummaryNotFoundException(UUID tripId) {
        super("확정 요약을 찾을 수 없어요. tripId=" + tripId);
    }
}
