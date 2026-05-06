package com.tripkey.dto.group;

import com.tripkey.dto.card.CardDto;

import java.util.List;

public record StockGroup(
        String label,
        String groupReason,
        List<CardDto> cards
) {
    public static StockGroup of(String label, List<CardDto> cards) {
        return new StockGroup(label, null, cards);
    }
}
