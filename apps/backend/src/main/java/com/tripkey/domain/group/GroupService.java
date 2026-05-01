package com.tripkey.domain.group;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.group.Groups03Response;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;

    @Transactional(readOnly = true)
    public Groups03Response getGroups03(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<CardDto> inputRequired = new ArrayList<>();
        List<CardDto> selectRequired = new ArrayList<>();
        List<CardDto> fixRequired = new ArrayList<>();
        List<CardDto> reviewOnly = new ArrayList<>();
        List<CardDto> excluded = new ArrayList<>();

        placeCardRepository.findAllByTripId(tripId).stream()
                .sorted(Comparator.comparing(PlaceCard::getCreatedAt))
                .map(CardDto::from)
                .forEach(card -> {
                    if (Boolean.TRUE.equals(card.isExcluded())) {
                        excluded.add(card);
                        return;
                    }
                    switch (card.actionType()) {
                        case "input_required" -> inputRequired.add(card);
                        case "select_required" -> selectRequired.add(card);
                        case "fix_required" -> fixRequired.add(card);
                        case "review_only" -> reviewOnly.add(card);
                        default -> {
                            // action_type 은 BE 가 계산하는 enum 이므로 정상 동작 시 도달 불가.
                        }
                    }
                });

        return Groups03Response.of(inputRequired, selectRequired, fixRequired, reviewOnly, excluded);
    }
}
