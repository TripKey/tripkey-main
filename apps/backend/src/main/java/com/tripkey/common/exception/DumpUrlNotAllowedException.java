package com.tripkey.common.exception;

public class DumpUrlNotAllowedException extends RuntimeException {

    public DumpUrlNotAllowedException() {
        super("URL은 입력할 수 없어요. 텍스트로 적어주세요");
    }
}
