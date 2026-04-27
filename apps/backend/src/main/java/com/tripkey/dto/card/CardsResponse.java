package com.tripkey.dto.card;

import java.util.List;

public record CardsResponse(
        List<CardDto> cards,
        String contextSummary,
        List<AlertCardDto> alertCards
) {
}
