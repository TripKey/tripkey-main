package com.tripkey.domain.group;

import com.tripkey.common.exception.InvalidDayParamException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.route.RouteService;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.group.DayViewModel;
import com.tripkey.dto.placement.RouteLeg;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DayViewService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final RouteService routeService;

    private static final LocalTime DAY_START = LocalTime.of(9, 0);

    @Transactional(readOnly = true)
    public DayViewModel getDayViewModel(UUID tripId, int dayNumber) {
        if (dayNumber < 1) {
            throw new InvalidDayParamException();
        }
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<PlaceCard> cardsForDay = placeCardRepository.findAllByTripIdAndDay(tripId, dayNumber).stream()
                .filter(card -> !Boolean.TRUE.equals(card.getIsExcluded()))
                .sorted(Comparator.comparing(PlaceCard::getCreatedAt))
                .toList();

        PlaceCard startTimeCard = null;
        PlaceCard endTimeCard = null;
        List<PlaceCard> otherCards = new ArrayList<>();

        for (PlaceCard card : cardsForDay) {
            String role = card.getFlightRole();
            if ("outbound".equals(role) && startTimeCard == null) {
                startTimeCard = card;
                continue;
            }
            if ("inbound".equals(role) && endTimeCard == null) {
                endTimeCard = card;
                continue;
            }
            otherCards.add(card);
        }

        // 활동 카드(항공 제외)에 고정 시작시각 기준 타임라인을 합성한다(미저장, dayOrder 기준 계산).
        Map<UUID, Integer> travelSecondsByFrom = routeService.readCachedLegs(tripId).stream()
                .filter(leg -> leg.day() != null && leg.day() == dayNumber)
                .collect(Collectors.toMap(RouteLeg::fromInstanceId, RouteLeg::durationSeconds, (a, b) -> a));
        List<PlaceCard> orderedByPlacement = otherCards.stream()
                .sorted(Comparator.comparing(c -> c.getDayOrder() == null ? Short.MAX_VALUE : c.getDayOrder()))
                .toList();
        Map<UUID, String> scheduledTimes = DayTimeline.compute(orderedByPlacement, travelSecondsByFrom, DAY_START);

        return DayViewModel.of(
                dayNumber,
                startTimeCard != null ? CardDto.from(startTimeCard) : null,
                endTimeCard != null ? CardDto.from(endTimeCard) : null,
                otherCards.stream()
                        .map(card -> CardDto.from(card).withScheduledTime(scheduledTimes.get(card.getInstanceId())))
                        .toList()
        );
    }
}
