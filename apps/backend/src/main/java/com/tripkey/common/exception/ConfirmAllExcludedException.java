package com.tripkey.common.exception;

public class ConfirmAllExcludedException extends RuntimeException {

    public ConfirmAllExcludedException() {
        super("배치된 장소가 모두 제외되어 있어요. 최소 1개 이상 포함해주세요");
    }
}
