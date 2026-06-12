package com.tripkey.domain.confirm;

import com.tripkey.common.exception.ConfirmAllExcludedException;
import com.tripkey.common.exception.ConfirmEmptyDaysException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.domain.verify.VerifyService;
import com.tripkey.dto.placement.PlacementDay;
import com.tripkey.dto.placement.PlacementDayItem;
import com.tripkey.dto.placement.PlacementSaveRequest;
import com.tripkey.dto.placement.PlacementSaveResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ConfirmService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final VerifyService verifyService;

    @Transactional
    public PlacementSaveResponse confirmAndSave(UUID tripId, PlacementSaveRequest request) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new TripNotFoundException(tripId));

        List<PlacementDay> days = request.days() == null ? List.of() : request.days();
        if (days.isEmpty()) {
            throw new ConfirmEmptyDaysException();
        }

        validateAllPlacedNotExcluded(tripId, days);

        PlacementSaveResponse verifyResponse = verifyService.verifyAndSave(tripId, request);
        trip.confirm();

        return PlacementSaveResponse.of(
                tripId,
                verifyResponse.skippedInstanceIds(),
                verifyResponse.routeWarnings(),
                verifyResponse.routeLegs()
        );
    }

    private void validateAllPlacedNotExcluded(UUID tripId, List<PlacementDay> days) {
        Set<UUID> placedInstanceIds = days.stream()
                .flatMap(day -> day.cards().stream())
                .map(PlacementDayItem::instanceId)
                .collect(Collectors.toSet());

        if (placedInstanceIds.isEmpty()) {
            throw new ConfirmEmptyDaysException();
        }

        Map<UUID, PlaceCard> cardsByInstanceId = new HashMap<>();
        for (PlaceCard card : placeCardRepository.findAllByTripId(tripId)) {
            cardsByInstanceId.put(card.getInstanceId(), card);
        }

        boolean anyIncluded = placedInstanceIds.stream()
                .map(cardsByInstanceId::get)
                .filter(card -> card != null)
                .anyMatch(card -> !Boolean.TRUE.equals(card.getIsExcluded()));

        if (!anyIncluded) {
            throw new ConfirmAllExcludedException();
        }
    }
}
