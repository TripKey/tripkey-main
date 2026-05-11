package com.tripkey.domain.verify;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VerifyService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;

    @Transactional
    public PlacementSaveResponse verifyAndSave(UUID tripId, PlacementSaveRequest request) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<PlacementDay> days = request.days() == null ? List.of() : request.days();
        if (days.isEmpty()) {
            return PlacementSaveResponse.of(tripId);
        }

        Map<UUID, PlaceCard> cardsByInstanceId = new HashMap<>();
        for (PlaceCard card : placeCardRepository.findAllByTripId(tripId)) {
            cardsByInstanceId.put(card.getInstanceId(), card);
        }

        for (PlacementDay day : days) {
            for (PlacementDayItem item : day.cards()) {
                PlaceCard card = cardsByInstanceId.get(item.instanceId());
                if (card == null) {
                    // stale instance_id (FE 가 보낸 카드가 DB 에 없음) → 조용히 무시
                    continue;
                }
                Short estimated = item.estimatedDurationMin() == null
                        ? null
                        : item.estimatedDurationMin().shortValue();
                card.applyDayPlacement(day.dayNumber(), item.order(), estimated);
            }
        }

        return PlacementSaveResponse.of(tripId);
    }
}
