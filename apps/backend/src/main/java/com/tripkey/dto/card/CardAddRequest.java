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

        String flightNumber,

        String flightDatetime,

        @Pattern(regexp = "outbound|inbound|middle",
                message = "flightRole은 outbound / inbound / middle 중 하나여야 해요")
        String flightRole,

        String departureAirport,

        String arrivalAirport,

        @Pattern(regexp = "manual|ai_request",
                message = "parseMode는 manual / ai_request 중 하나여야 해요")
        String parseMode,

        String naturalLanguageInput
) {
        public CardAddRequest(
                String name,
                String category,
                String location,
                Short estimatedDurationMin,
                String timeConstraint,
                String memo,
                String checkIn,
                String checkOut,
                String flightNumber,
                String parseMode,
                String naturalLanguageInput
        ) {
                this(
                        name,
                        category,
                        location,
                        estimatedDurationMin,
                        timeConstraint,
                        memo,
                        checkIn,
                        checkOut,
                        flightNumber,
                        null,
                        null,
                        null,
                        null,
                        parseMode,
                        naturalLanguageInput
                );
        }
}
