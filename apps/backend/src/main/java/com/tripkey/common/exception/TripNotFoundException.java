package com.tripkey.common.exception;

import java.util.UUID;

public class TripNotFoundException extends RuntimeException {

    public TripNotFoundException(UUID tripId) {
        super("여행 세션을 찾을 수 없어요. tripId=" + tripId);
    }
}
