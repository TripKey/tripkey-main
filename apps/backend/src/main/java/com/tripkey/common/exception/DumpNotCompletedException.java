package com.tripkey.common.exception;

public class DumpNotCompletedException extends RuntimeException {

    public DumpNotCompletedException() {
        super("파싱이 아직 완료되지 않았어요");
    }
}
