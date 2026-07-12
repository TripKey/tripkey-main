package com.tripkey.dto.optimize;

import java.util.List;
import java.util.UUID;

public record SuggestedItineraryResponse(UUID tripId, List<SuggestedDay> days, List<UnplacedCard> unplacedCards) {
    public record SuggestedDay(int day, String label, List<UUID> orderedInstanceIds,
                               int totalDurationSeconds) {}
    public record UnplacedCard(UUID instanceId, String reason) {}
}
