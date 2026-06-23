package com.tripkey.dto.common;

public record ErrorResponse(
        String code,
        String message
) {
}
