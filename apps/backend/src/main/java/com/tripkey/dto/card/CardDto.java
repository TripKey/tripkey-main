package com.tripkey.dto.card;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.tripkey.domain.place.PlaceCard;

import java.util.List;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record CardDto(
        UUID instanceId,
        String placeId,
        String name,
        String category,
        String classification,
        String placementStatus,
        String processingStatus,
        String actionType,
        Boolean canExclude,
        Boolean allowDuplicate,
        Boolean isExcluded,
        Boolean isAiGenerated,
        Short estimatedDurationMin,
        Coordinates coordinates,
        String location,
        String address,
        String timeConstraint,
        String questionText,
        List<String> options,
        String blockedReason,
        String userContext,
        String tips,
        List<String> tags,
        String source,
        Integer day,
        Short dayOrder,
        String notes,
        String memo,
        String checkIn,
        String checkOut,
        String flightNumber,
        String flightDatetime,
        String flightRole
) {

    public record Coordinates(Double lat, Double lng) {
    }

    public static CardDto from(PlaceCard card) {
        Coordinates coords = (card.getLat() != null && card.getLng() != null)
                ? new Coordinates(card.getLat(), card.getLng())
                : null;

        return new CardDto(
                card.getInstanceId(),
                card.getPlaceId(),
                card.getName(),
                card.getCategory(),
                card.getClassification(),
                card.getPlacementStatus(),
                card.getProcessingStatus(),
                card.getActionType(),
                card.getCanExclude(),
                card.getAllowDuplicate(),
                card.getIsExcluded(),
                card.getIsAiGenerated(),
                card.getEstimatedDurationMin(),
                coords,
                card.getLocation(),
                card.getAddress(),
                card.getTimeConstraint(),
                card.getQuestionText(),
                card.getOptions(),
                card.getBlockedReason(),
                card.getUserContext(),
                card.getTips(),
                card.getTags(),
                card.getSource(),
                card.getDay(),
                card.getDayOrder(),
                card.getNotes(),
                card.getMemo(),
                card.getCheckIn(),
                card.getCheckOut(),
                card.getFlightNumber(),
                card.getFlightDatetime(),
                card.getFlightRole()
        );
    }
}
