package com.tripkey.domain.trip;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.dto.trip.DestinationSearchResponse;
import com.tripkey.dto.trip.DestinationSearchResponse.DestinationDto;
import com.tripkey.dto.trip.TripCreateRequest;
import com.tripkey.dto.trip.TripCreateResponse;
import com.tripkey.dto.trip.TripDetailResponse;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiDestinationSearchResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TripService {

    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final AiEngineClient aiEngineClient;

    private static final List<DestinationDto> FALLBACK_DESTINATIONS = List.of(
            new DestinationDto("오사카", "일본", null),
            new DestinationDto("도쿄", "일본", null),
            new DestinationDto("교토", "일본", null),
            new DestinationDto("후쿠오카", "일본", null),
            new DestinationDto("방콕", "태국", null),
            new DestinationDto("파리", "프랑스", null),
            new DestinationDto("런던", "영국", null),
            new DestinationDto("뉴욕", "미국", null),
            new DestinationDto("하노이", "베트남", null),
            new DestinationDto("다낭", "베트남", null),
            new DestinationDto("싱가포르", "싱가포르", null),
            new DestinationDto("타이베이", "대만", null)
    );

    @Transactional(readOnly = true)
    public DestinationSearchResponse searchDestinations(String query) {
        try {
            AiDestinationSearchResponse ai = aiEngineClient.searchDestinations(query);
            List<DestinationDto> results = ai.results().stream()
                    .map(r -> new DestinationDto(r.name(), r.country(), r.placeId()))
                    .toList();
            return new DestinationSearchResponse(results);
        } catch (Exception e) {
            log.warn("Destination search via AI engine failed; falling back to local list. query={}", query, e);
            List<DestinationDto> filtered = FALLBACK_DESTINATIONS.stream()
                    .filter(d -> d.name().contains(query) || d.country().contains(query))
                    .toList();
            return new DestinationSearchResponse(filtered);
        }
    }

    @Transactional(readOnly = true)
    public TripDetailResponse getTripDetail(UUID tripId) {
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new TripNotFoundException(tripId));
        List<String> destinations = tripDestinationRepository
                .findByTripTripIdOrderBySortOrder(tripId)
                .stream()
                .map(TripDestination::getName)
                .toList();
        return TripDetailResponse.of(trip, destinations);
    }

    @Transactional
    public TripCreateResponse create(TripCreateRequest request) {
        Trip trip = new Trip(
                request.travelDays(),
                request.companionCount(),
                request.startDate()
        );
        tripRepository.save(trip);

        for (short i = 0; i < request.destinations().size(); i++) {
            TripDestination destination = new TripDestination(
                    trip,
                    request.destinations().get(i),
                    i
            );
            tripDestinationRepository.save(destination);
        }

        return new TripCreateResponse(trip.getTripId(), trip.getCreatedAt());
    }
}
