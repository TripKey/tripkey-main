package com.tripkey.dto.group;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.tripkey.dto.card.CardDto;

import java.util.List;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record DayViewModel(
        String dayId,
        CardDto startTimeCard,
        CardDto endTimeCard,
        List<CardDto> cards
) {
    public static DayViewModel of(int dayNumber, CardDto startTimeCard, CardDto endTimeCard, List<CardDto> cards) {
        return new DayViewModel("day" + dayNumber, startTimeCard, endTimeCard, cards);
    }
}
