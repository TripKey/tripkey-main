package com.tripkey.common.exception;

public class InvalidDayParamException extends RuntimeException {

    public InvalidDayParamException() {
        super("day_number 는 1 이상이어야 해요");
    }
}
