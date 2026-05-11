package com.tripkey.common.exception;

public class ConfirmEmptyDaysException extends RuntimeException {

    public ConfirmEmptyDaysException() {
        super("아직 일정에 배치된 장소가 없어요. 하루 이상 일정을 구성해주세요");
    }
}
