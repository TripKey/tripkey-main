package com.tripkey.common.exception;

import java.util.UUID;

public class CardNotFoundException extends RuntimeException {

    public CardNotFoundException(UUID tripId, UUID instanceId) {
        super("카드를 찾을 수 없어요. tripId=" + tripId + ", instanceId=" + instanceId);
    }
}
