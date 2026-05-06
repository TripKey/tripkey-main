package com.tripkey.dto.group;

import com.tripkey.dto.card.CardDto;

import java.util.List;

public record Groups04Response(
        String view,
        List<StockGroup> available,
        List<CardDto> pendingReorder,
        List<CardDto> unavailable
) {
    public static Groups04Response of(
            List<StockGroup> available,
            List<CardDto> pendingReorder,
            List<CardDto> unavailable
    ) {
        return new Groups04Response("04", available, pendingReorder, unavailable);
    }
}
