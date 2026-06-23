package com.tripkey.common.exception;

public class InvalidViewParamException extends RuntimeException {

    public InvalidViewParamException() {
        super("view 파라미터는 03 또는 04여야 해요");
    }
}
