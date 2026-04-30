package com.tripkey.common.exception;

public class InvalidClassificationTransitionException extends RuntimeException {

    public InvalidClassificationTransitionException(String from, String to) {
        super("허용되지 않는 상태 변경이에요. " + from + " → " + to);
    }
}
