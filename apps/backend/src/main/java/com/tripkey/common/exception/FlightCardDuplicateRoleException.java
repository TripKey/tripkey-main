package com.tripkey.common.exception;

public class FlightCardDuplicateRoleException extends RuntimeException {

    public FlightCardDuplicateRoleException() {
        super("같은 역할의 항공편 카드가 이미 있어요. 기존 카드를 수정해주세요");
    }
}
