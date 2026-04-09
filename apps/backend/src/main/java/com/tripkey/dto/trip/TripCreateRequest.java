package com.tripkey.dto.trip;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record TripCreateRequest(
        @NotEmpty(message = "여행지를 하나 이상 선택해주세요")
        List<String> destinations,

        @NotNull(message = "여행 일수를 입력해주세요")
        @Min(value = 1, message = "여행 일수는 1일 이상이어야 해요")
        @Max(value = 30, message = "여행 일수는 30일 이하여야 해요")
        Short travelDays,

        @NotNull(message = "동행 인원을 입력해주세요")
        @Min(value = 1, message = "동행 인원은 1명 이상이어야 해요")
        @Max(value = 20, message = "동행 인원은 20명 이하여야 해요")
        Short companionCount,

        @NotNull(message = "항공편 보유 여부를 선택해주세요")
        Boolean hasFlight,

        @NotNull(message = "숙소 보유 여부를 선택해주세요")
        Boolean hasAccommodation
) {
}
