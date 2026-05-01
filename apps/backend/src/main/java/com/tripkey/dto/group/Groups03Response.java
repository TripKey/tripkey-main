package com.tripkey.dto.group;

import com.tripkey.dto.card.CardDto;

import java.util.List;

public record Groups03Response(
        String view,
        List<CardDto> inputRequired,
        List<CardDto> selectRequired,
        List<CardDto> fixRequired,
        List<CardDto> reviewOnly,
        List<CardDto> excluded
) {
    public static Groups03Response of(
            List<CardDto> inputRequired,
            List<CardDto> selectRequired,
            List<CardDto> fixRequired,
            List<CardDto> reviewOnly,
            List<CardDto> excluded
    ) {
        return new Groups03Response(
                "03",
                inputRequired,
                selectRequired,
                fixRequired,
                reviewOnly,
                excluded
        );
    }
}
