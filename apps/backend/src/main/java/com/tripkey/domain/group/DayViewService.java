package com.tripkey.domain.group;

import com.tripkey.common.exception.InvalidDayParamException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.group.DayViewModel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DayViewService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;

    @Transactional(readOnly = true)
    public DayViewModel getDayViewModel(UUID tripId, int dayNumber) {
        if (dayNumber < 1) {
            throw new InvalidDayParamException();
        }
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<PlaceCard> cardsForDay = placeCardRepository.findAllByTripIdAndDay(tripId, dayNumber).stream()
                .sorted(Comparator.comparing(PlaceCard::getCreatedAt))
                .toList();

        int maxDay = placeCardRepository.findMaxDayByTripId(tripId);

        PlaceCard startTimeCard = null;
        PlaceCard endTimeCard = null;
        List<PlaceCard> otherCards = new ArrayList<>();

        for (PlaceCard card : cardsForDay) {
            boolean isFlightCard = "transport".equals(card.getCategory())
                    && card.getFlightNumber() != null
                    && !card.getFlightNumber().isBlank();

            if (isFlightCard) {
                if (dayNumber == 1 && startTimeCard == null) {
                    startTimeCard = card;
                    continue;
                }
                if (dayNumber == maxDay && endTimeCard == null) {
                    endTimeCard = card;
                    continue;
                }
            }
            otherCards.add(card);
        }

        return DayViewModel.of(
                dayNumber,
                startTimeCard != null ? CardDto.from(startTimeCard) : null,
                endTimeCard != null ? CardDto.from(endTimeCard) : null,
                otherCards.stream().map(CardDto::from).toList()
        );
    }
}
