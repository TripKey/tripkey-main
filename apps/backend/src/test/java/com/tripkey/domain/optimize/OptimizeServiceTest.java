package com.tripkey.domain.optimize;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.optimize.OptimizeResponse;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderRequest;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OptimizeServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private AiEngineClient aiEngineClient;

    @InjectMocks
    private OptimizeService optimizeService;

    private PlaceCard card(UUID id, Integer day, short order, Double lat, Double lng,
                           String category, boolean excluded) {
        PlaceCard c = org.mockito.Mockito.mock(PlaceCard.class);
        lenient().when(c.getInstanceId()).thenReturn(id);
        lenient().when(c.getDay()).thenReturn(day);
        lenient().when(c.getDayOrder()).thenReturn(order);
        lenient().when(c.getLat()).thenReturn(lat);
        lenient().when(c.getLng()).thenReturn(lng);
        lenient().when(c.getCategory()).thenReturn(category);
        lenient().when(c.getIsExcluded()).thenReturn(excluded);
        lenient().when(c.getEstimatedDurationMin()).thenReturn(null); // Mockito 기본값(0) 방지
        return c;
    }

    @Test
    void optimizeReturnsPerDaySuggestionWithAccommodationAnchor() {
        UUID tripId = UUID.randomUUID();
        UUID acc = UUID.randomUUID();
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();

        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard accCard = card(acc, 1, (short) 0, 34.70, 135.50, "accommodation", false);
        PlaceCard place1 = card(p1, 1, (short) 1, 34.71, 135.51, "place", false);
        PlaceCard place2 = card(p2, 1, (short) 2, 34.72, 135.52, "food", false);
        PlaceCard day2 = card(UUID.randomUUID(), 2, (short) 0, 35.0, 135.0, "place", false);
        PlaceCard noCoord = card(UUID.randomUUID(), 1, (short) 3, null, null, "place", false);
        PlaceCard excluded = card(UUID.randomUUID(), 1, (short) 4, 34.7, 135.5, "place", true);

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(accCard, place1, place2, day2, noCoord, excluded));

        // Day1: 3 stops → AI 호출, 재정렬 결과 반환. Day2: 1 stop → 스킵(AI 미호출).
        when(aiEngineClient.optimizeOrder(any())).thenReturn(
                new AiOptimizeOrderResponse(
                        List.of(acc.toString(), p2.toString(), p1.toString()), 1800, "google"));

        OptimizeResponse res = optimizeService.optimize(tripId);

        assertThat(res.tripId()).isEqualTo(tripId);
        assertThat(res.days()).hasSize(1);
        OptimizeResponse.DayOrder d = res.days().get(0);
        assertThat(d.day()).isEqualTo(1);
        assertThat(d.orderedInstanceIds()).containsExactly(acc, p2, p1);
        assertThat(d.totalDurationSeconds()).isEqualTo(1800);
        assertThat(d.source()).isEqualTo("google");

        ArgumentCaptor<AiOptimizeOrderRequest> captor =
                ArgumentCaptor.forClass(AiOptimizeOrderRequest.class);
        verify(aiEngineClient, times(1)).optimizeOrder(captor.capture());
        AiOptimizeOrderRequest req = captor.getValue();
        assertThat(req.startInstanceId()).isEqualTo(acc.toString());
        // 항공편 없음 → 종료 앵커 = 숙소(시작과 동일) → AI 가 귀가 closed-tour 로 최적화 (#275)
        assertThat(req.endInstanceId()).isEqualTo(acc.toString());
        assertThat(req.stops()).hasSize(3);
        // day_order 정렬: acc(0) → place1(1) → place2(2)
        assertThat(req.stops().get(0).instanceId()).isEqualTo(acc.toString());
        assertThat(req.stops().get(1).instanceId()).isEqualTo(p1.toString());
        assertThat(req.stops().get(2).instanceId()).isEqualTo(p2.toString());
    }

    @Test
    void optimizePassesOutboundFlightAsStartAnchor() {
        UUID tripId = UUID.randomUUID();
        UUID acc = UUID.randomUUID();
        UUID place = UUID.randomUUID();
        UUID flight = UUID.randomUUID();

        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard accCard = card(acc, 1, (short) 0, 34.70, 135.50, "accommodation", false);
        PlaceCard placeCard = card(place, 1, (short) 1, 34.71, 135.51, "place", false);
        PlaceCard flightCard = card(flight, 1, (short) 2, 34.79, 135.44, "transport", false);
        lenient().when(flightCard.getFlightRole()).thenReturn("outbound"); // 첫날 도착편

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(accCard, placeCard, flightCard));
        when(aiEngineClient.optimizeOrder(any())).thenReturn(
                new AiOptimizeOrderResponse(
                        List.of(flight.toString(), place.toString(), acc.toString()), 1500, "google"));

        optimizeService.optimize(tripId);

        ArgumentCaptor<AiOptimizeOrderRequest> captor =
                ArgumentCaptor.forClass(AiOptimizeOrderRequest.class);
        verify(aiEngineClient).optimizeOrder(captor.capture());
        AiOptimizeOrderRequest req = captor.getValue();
        // 도착 항공(outbound) = 시작 앵커, 숙소 = 종료 앵커(공항 도착 → 관광 → 숙소 체크인)
        assertThat(req.startInstanceId()).isEqualTo(flight.toString());
        assertThat(req.endInstanceId()).isEqualTo(acc.toString());
    }

    @Test
    void optimizePassesPinAndReservedTimeConstraints() {
        UUID tripId = UUID.randomUUID();
        UUID p1 = UUID.randomUUID();
        UUID p2 = UUID.randomUUID();
        UUID p3 = UUID.randomUUID();

        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard reserved = card(p1, 1, (short) 0, 34.70, 135.50, "food", false);
        lenient().when(reserved.getTimeConstraint()).thenReturn("14:30 예약");
        lenient().when(reserved.getEstimatedDurationMin()).thenReturn((short) 90);
        PlaceCard pinnedNoTime = card(p2, 1, (short) 1, 34.71, 135.51, "place", false);
        lenient().when(pinnedNoTime.getTimeConstraint()).thenReturn("오후 늦게");
        PlaceCard free = card(p3, 1, (short) 2, 34.72, 135.52, "place", false);

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(reserved, pinnedNoTime, free));
        when(aiEngineClient.optimizeOrder(any())).thenReturn(
                new AiOptimizeOrderResponse(
                        List.of(p1.toString(), p2.toString(), p3.toString()), 900, "google"));

        optimizeService.optimize(tripId);

        ArgumentCaptor<AiOptimizeOrderRequest> captor =
                ArgumentCaptor.forClass(AiOptimizeOrderRequest.class);
        verify(aiEngineClient).optimizeOrder(captor.capture());
        List<AiOptimizeOrderRequest.Stop> stops = captor.getValue().stops();
        // 예약 시각 파싱: pinned + reserved_time + 체류시간
        assertThat(stops.get(0).pinned()).isTrue();
        assertThat(stops.get(0).reservedTime()).isEqualTo("14:30");
        assertThat(stops.get(0).durationMin()).isEqualTo(90);
        // HH:MM 없는 time_constraint → 위치 고정만 (reserved_time 없음)
        assertThat(stops.get(1).pinned()).isTrue();
        assertThat(stops.get(1).reservedTime()).isNull();
        // 제약 없는 카드
        assertThat(stops.get(2).pinned()).isFalse();
        assertThat(stops.get(2).reservedTime()).isNull();
        assertThat(stops.get(2).durationMin()).isNull();
    }

    @Test
    void optimizePassesFlightCardAsEndAnchor() {
        UUID tripId = UUID.randomUUID();
        UUID acc = UUID.randomUUID();
        UUID place = UUID.randomUUID();
        UUID flight = UUID.randomUUID();

        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard accCard = card(acc, 1, (short) 0, 34.70, 135.50, "accommodation", false);
        PlaceCard placeCard = card(place, 1, (short) 1, 34.71, 135.51, "place", false);
        PlaceCard flightCard = card(flight, 1, (short) 2, 34.79, 135.44, "transport", false);

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(accCard, placeCard, flightCard));
        when(aiEngineClient.optimizeOrder(any())).thenReturn(
                new AiOptimizeOrderResponse(
                        List.of(acc.toString(), place.toString(), flight.toString()), 1200, "google"));

        optimizeService.optimize(tripId);

        ArgumentCaptor<AiOptimizeOrderRequest> captor =
                ArgumentCaptor.forClass(AiOptimizeOrderRequest.class);
        verify(aiEngineClient).optimizeOrder(captor.capture());
        AiOptimizeOrderRequest req = captor.getValue();
        // 시작=숙소, 종료=항공(교통) 카드
        assertThat(req.startInstanceId()).isEqualTo(acc.toString());
        assertThat(req.endInstanceId()).isEqualTo(flight.toString());
    }

    @Test
    void skipsDaysWithFewerThanTwoStopsAndDoesNotCallAi() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        PlaceCard single = card(UUID.randomUUID(), 1, (short) 0, 34.70, 135.50, "place", false);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(single));

        OptimizeResponse res = optimizeService.optimize(tripId);

        assertThat(res.days()).isEmpty();
        verify(aiEngineClient, never()).optimizeOrder(any());
    }

    @Test
    void throwsWhenTripNotFound() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);
        assertThatThrownBy(() -> optimizeService.optimize(tripId))
                .isInstanceOf(TripNotFoundException.class);
    }
}
