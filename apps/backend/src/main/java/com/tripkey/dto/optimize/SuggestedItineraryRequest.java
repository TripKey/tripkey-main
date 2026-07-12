package com.tripkey.dto.optimize;

public record SuggestedItineraryRequest(TravelStyle travelStyle, Pace pace) {
    public enum TravelStyle { BALANCED, SIGHTSEEING, FOOD }
    public enum Pace { RELAXED, NORMAL, PACKED }

    public SuggestedItineraryRequest normalized() {
        return new SuggestedItineraryRequest(
                travelStyle == null ? TravelStyle.BALANCED : travelStyle,
                pace == null ? Pace.NORMAL : pace);
    }
}
