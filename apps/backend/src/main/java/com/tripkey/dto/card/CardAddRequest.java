package com.tripkey.dto.card;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CardAddRequest(
        @NotBlank(message = "카드 이름을 입력해주세요")
        String name,

        @NotNull(message = "카테고리를 선택해주세요")
        @Pattern(regexp = "place|activity|transport|accommodation|food|etc",
                message = "카테고리는 place / activity / transport / accommodation / food / etc 중 하나여야 해요")
        String category,

        String location,

        Short estimatedDurationMin,

        String timeConstraint,

        String memo,

        String checkIn,

        String checkOut,

        String flightNumber
) {
}
