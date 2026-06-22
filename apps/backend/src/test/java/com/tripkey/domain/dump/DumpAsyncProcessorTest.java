package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiParseRequest;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DumpAsyncProcessorTest {

    @Mock
    private DumpJobRepository dumpJobRepository;

    @Mock
    private TripRepository tripRepository;

    @Mock
    private TripDestinationRepository tripDestinationRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private AlertCardRepository alertCardRepository;

    @Mock
    private AiEngineClient aiEngineClient;

    @Mock
    private EnrichmentOutboxRepository enrichmentOutboxRepository;

    private DumpAsyncProcessor dumpAsyncProcessor;

    @BeforeEach
    void setUp() {
        dumpAsyncProcessor = new DumpAsyncProcessor(
                dumpJobRepository, tripRepository, tripDestinationRepository,
                placeCardRepository, alertCardRepository, aiEngineClient,
                enrichmentOutboxRepository, new com.fasterxml.jackson.databind.ObjectMapper());
    }

    @Test
    void processMarksJobCompletedAndStoresParsedCards() {
        UUID tripId = UUID.randomUUID();
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.");
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        AiPlaceCardDto card = new AiPlaceCardDto(
                "place-1",
                "도톤보리",
                "place",
                "confirmed",
                "ready_partial",
                false,
                false,
                (short) 90,
                new AiPlaceCardDto.Coordinates(34.6687, 135.5013),
                "오사카 중앙구",
                null,
                null,
                "야간 방문 추천",
                null,
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null
        );

        AiParseResponse response = new AiParseResponse(
                List.of(card),
                "오사카 시내 중심 동선",
                List.of(),
                "3.2.0"
        );

        when(dumpJobRepository.findById(job.getJobId())).thenReturn(Optional.of(job));
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of(destination));
        when(aiEngineClient.parseDump(any())).thenReturn(response);
        when(placeCardRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        dumpAsyncProcessor.process(job.getJobId());

        verify(placeCardRepository).deleteAllByTripId(tripId);
        ArgumentCaptor<List<PlaceCard>> cardsCaptor = ArgumentCaptor.forClass(List.class);
        verify(placeCardRepository).saveAll(cardsCaptor.capture());
        assertThat(cardsCaptor.getValue())
                .extracting(PlaceCard::getProcessingStatus)
                .containsOnly("pending");

        verify(enrichmentOutboxRepository).saveAll(anyList());

        assertThat(job.getStatus()).isEqualTo("completed");
        assertThat(job.getStep()).isEqualTo((short) 3);
        assertThat(job.getContextSummary()).isEqualTo("오사카 시내 중심 동선");
        assertThat(job.getErrorCode()).isNull();
    }

    @Test
    void processPersistsAlertCardsFromParseResponse() {
        UUID tripId = UUID.randomUUID();
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.");
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        AiPlaceCardDto card = new AiPlaceCardDto(
                "place-1", "도톤보리", "place", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카 중앙구",
                null, null, null, null, null, null, null, List.of(), null, null, null
        );

        AiParseResponse.AlertCard alert1 = new AiParseResponse.AlertCard(
                "alert-1", "timing_conflict", "practical", "trip", null, "체크인 시각 확인 필요", null
        );
        AiParseResponse.AlertCard alert2 = new AiParseResponse.AlertCard(
                "alert-2", "festival", "insight", "trip", null, "축제 기간입니다", null
        );

        AiParseResponse response = new AiParseResponse(
                List.of(card), "오사카 시내 중심 동선", List.of(alert1, alert2), "3.2.0"
        );

        when(dumpJobRepository.findById(job.getJobId())).thenReturn(Optional.of(job));
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of(destination));
        when(aiEngineClient.parseDump(any())).thenReturn(response);
        when(placeCardRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        dumpAsyncProcessor.process(job.getJobId());

        verify(alertCardRepository).deleteByTripIdAndAlertIdIn(eq(tripId), any());
        ArgumentCaptor<List<AlertCard>> captor = ArgumentCaptor.forClass(List.class);
        verify(alertCardRepository).saveAll(captor.capture());
        List<AlertCard> persisted = captor.getValue();
        assertThat(persisted).hasSize(2);
        assertThat(persisted).extracting(AlertCard::getAlertId).containsExactly("alert-1", "alert-2");
        assertThat(persisted).extracting(AlertCard::getTripId).containsOnly(tripId);
        assertThat(persisted).extracting(AlertCard::getJobId).containsOnly(job.getJobId());
    }

    @Test
    void processSkipsAlertSaveWhenResponseHasNoAlerts() {
        UUID tripId = UUID.randomUUID();
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.");
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        AiPlaceCardDto card = new AiPlaceCardDto(
                "place-1", "도톤보리", "place", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카 중앙구",
                null, null, null, null, null, null, null, List.of(), null, null, null
        );

        AiParseResponse response = new AiParseResponse(
                List.of(card), "오사카 시내 중심 동선", List.of(), "3.2.0"
        );

        when(dumpJobRepository.findById(job.getJobId())).thenReturn(Optional.of(job));
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of(destination));
        when(aiEngineClient.parseDump(any())).thenReturn(response);
        when(placeCardRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));

        dumpAsyncProcessor.process(job.getJobId());

        verify(alertCardRepository, never()).deleteByTripIdAndAlertIdIn(any(), any());
        verify(alertCardRepository, never()).saveAll(any());
    }

    @Test
    void processPassesStoredFlightsToParseRequest() {
        UUID tripId = UUID.randomUUID();
        String depJson = "{\"departure_airport\":\"ICN\",\"arrival_airport\":\"NRT\",\"flight_number\":\"KE703\",\"datetime\":\"2026-07-01T09:00:00+09:00\"}";
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.", depJson, null);
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        AiPlaceCardDto card = new AiPlaceCardDto(
                "place-1", "도톈보리", "place", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카",
                null, null, null, null, null, null, null, List.of(), null, null, null);
        AiParseResponse response = new AiParseResponse(List.of(card), "요약", List.of(), "3.2.0");

        when(dumpJobRepository.findById(job.getJobId())).thenReturn(Optional.of(job));
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of(destination));
        when(placeCardRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        org.mockito.ArgumentCaptor<AiParseRequest> captor = org.mockito.ArgumentCaptor.forClass(AiParseRequest.class);
        when(aiEngineClient.parseDump(captor.capture())).thenReturn(response);

        dumpAsyncProcessor.process(job.getJobId());

        AiParseRequest sent = captor.getValue();
        assertThat(sent.departureFlight()).isNotNull();
        assertThat(sent.departureFlight().departureAirport()).isEqualTo("ICN");
        assertThat(sent.departureFlight().flightNumber()).isEqualTo("KE703");
        assertThat(sent.returnFlight()).isNull();
    }

    @Test
    void processPassesStoredAccommodationsToParseRequest() {
        UUID tripId = UUID.randomUUID();
        String accJson = "[{\"name\":\"호텔 그란비아 오사카\",\"location\":\"오사카\",\"check_in\":\"2026-07-01\",\"check_out\":\"2026-07-03\"}]";
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.", null, null, accJson);
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        AiPlaceCardDto card = new AiPlaceCardDto(
                "place-1", "도톈보리", "place", "confirmed", "ready_partial",
                false, false, (short) 90, null, "오사카",
                null, null, null, null, null, null, null, List.of(), null, null, null);
        AiParseResponse response = new AiParseResponse(List.of(card), "요약", List.of(), "3.2.0");

        when(dumpJobRepository.findById(job.getJobId())).thenReturn(Optional.of(job));
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of(destination));
        when(placeCardRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<AiParseRequest> captor = ArgumentCaptor.forClass(AiParseRequest.class);
        when(aiEngineClient.parseDump(captor.capture())).thenReturn(response);

        dumpAsyncProcessor.process(job.getJobId());

        AiParseRequest sent = captor.getValue();
        assertThat(sent.accommodationInputs()).isNotNull().hasSize(1);
        assertThat(sent.accommodationInputs().get(0).name()).isEqualTo("호텔 그란비아 오사카");
        assertThat(sent.accommodationInputs().get(0).checkIn()).isEqualTo("2026-07-01");
        assertThat(sent.accommodationInputs().get(0).checkOut()).isEqualTo("2026-07-03");
    }

    @Test
    void processCreatesDeterministicFlightCardsAndDropsAiFlightCards() {
        UUID tripId = UUID.randomUUID();
        String depJson = "{\"departure_airport\":\"ICN\",\"arrival_airport\":\"KIX\",\"flight_number\":\"KE723\",\"datetime\":\"2026-07-01T09:00:00+09:00\"}";
        String retJson = "{\"departure_airport\":\"KIX\",\"arrival_airport\":\"ICN\",\"flight_number\":\"KE724\",\"datetime\":\"2026-07-04T18:00:00+09:00\"}";
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.", depJson, retJson);
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        // AI 도 flight_role 있는 transport 카드를 만들지만(프롬프트 규약) 결정론 생성으로 대체되어 버려져야 한다.
        AiPlaceCardDto aiFlight = new AiPlaceCardDto(
                null, "AI가만든항공편", "transport", "confirmed", "ready_partial",
                false, false, null, null, null,
                null, null, null, null, null, List.of(), null, List.of(),
                null, null, "KE723", "2026-07-01T09:00:00+09:00", "outbound");
        AiParseResponse response = new AiParseResponse(
                List.of(placeCard("도톤보리"), aiFlight), "요약", List.of(), "3.2.0");

        stubProcess(job, trip, destination, response);

        dumpAsyncProcessor.process(job.getJobId());

        List<PlaceCard> saved = captureSavedCards();
        List<PlaceCard> flights = saved.stream()
                .filter(c -> "transport".equals(c.getCategory())).toList();
        assertThat(flights).hasSize(2);
        assertThat(saved).extracting(PlaceCard::getName).doesNotContain("AI가만든항공편");

        PlaceCard outbound = flights.stream()
                .filter(c -> "outbound".equals(c.getFlightRole())).findFirst().orElseThrow();
        assertThat(outbound.getDepartureAirport()).isEqualTo("ICN");
        assertThat(outbound.getArrivalAirport()).isEqualTo("KIX");
        assertThat(outbound.getFlightNumber()).isEqualTo("KE723");
        assertThat(outbound.getFlightDatetime()).isEqualTo("2026-07-01T09:00:00+09:00");
        assertThat(outbound.getSource()).isEqualTo("user_input");

        PlaceCard inbound = flights.stream()
                .filter(c -> "inbound".equals(c.getFlightRole())).findFirst().orElseThrow();
        assertThat(inbound.getDepartureAirport()).isEqualTo("KIX");
        assertThat(inbound.getArrivalAirport()).isEqualTo("ICN");
        assertThat(inbound.getFlightNumber()).isEqualTo("KE724");
    }

    @Test
    void processCreatesDeterministicAccommodationCardAndDropsAiAccommodationCards() {
        UUID tripId = UUID.randomUUID();
        String accJson = "[{\"name\":\"호텔 그란비아 오사카\",\"location\":\"오사카\",\"check_in\":\"2026-07-01\",\"check_out\":\"2026-07-03\"}]";
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.", null, null, accJson);
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        AiPlaceCardDto aiAccommodation = new AiPlaceCardDto(
                null, "AI가만든숙소", "accommodation", "confirmed", "ready_partial",
                false, false, null, null, "오사카",
                null, null, null, null, null, List.of(), null, List.of(),
                "2026-07-01", "2026-07-03", null, null, null);
        AiParseResponse response = new AiParseResponse(
                List.of(placeCard("도톤보리"), aiAccommodation), "요약", List.of(), "3.2.0");

        stubProcess(job, trip, destination, response);

        dumpAsyncProcessor.process(job.getJobId());

        List<PlaceCard> saved = captureSavedCards();
        List<PlaceCard> accommodations = saved.stream()
                .filter(c -> "accommodation".equals(c.getCategory())).toList();
        assertThat(accommodations).hasSize(1);
        assertThat(saved).extracting(PlaceCard::getName).doesNotContain("AI가만든숙소");

        PlaceCard acc = accommodations.get(0);
        assertThat(acc.getName()).isEqualTo("호텔 그란비아 오사카");
        assertThat(acc.getLocation()).isEqualTo("오사카");
        assertThat(acc.getCheckIn()).isEqualTo("2026-07-01");
        assertThat(acc.getCheckOut()).isEqualTo("2026-07-03");
        assertThat(acc.getSource()).isEqualTo("user_input");
    }

    @Test
    void processExcludesDeterministicFlightCardsFromEnrichmentButKeepsAccommodation() {
        UUID tripId = UUID.randomUUID();
        String depJson = "{\"departure_airport\":\"ICN\",\"arrival_airport\":\"KIX\",\"flight_number\":\"KE723\",\"datetime\":\"2026-07-01T09:00:00+09:00\"}";
        String accJson = "[{\"name\":\"호텔 그란비아 오사카\",\"location\":\"오사카\",\"check_in\":\"2026-07-01\",\"check_out\":\"2026-07-03\"}]";
        DumpJob job = DumpJob.create(tripId, "오사카 3박4일 여행입니다.", depJson, null, accJson);
        Trip trip = new Trip((short) 4, (short) 2);
        TripDestination destination = new TripDestination(trip, "오사카", (short) 0);

        AiParseResponse response = new AiParseResponse(
                List.of(placeCard("도톤보리")), "요약", List.of(), "3.2.0");

        stubProcess(job, trip, destination, response);

        dumpAsyncProcessor.process(job.getJobId());

        // 저장 카드 = place 1 + 결정론 항공 1 + 결정론 숙박 1 = 3
        assertThat(captureSavedCards()).hasSize(3);

        // enrichment 큐 = place + 숙박 (결정론 항공은 제외) = 2
        ArgumentCaptor<List<EnrichmentOutbox>> outboxCaptor = ArgumentCaptor.forClass(List.class);
        verify(enrichmentOutboxRepository).saveAll(outboxCaptor.capture());
        assertThat(outboxCaptor.getValue()).hasSize(2);
    }

    private void stubProcess(DumpJob job, Trip trip, TripDestination destination, AiParseResponse response) {
        when(dumpJobRepository.findById(job.getJobId())).thenReturn(Optional.of(job));
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(inv -> inv.getArgument(0));
        when(tripRepository.findById(job.getTripId())).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(job.getTripId()))
                .thenReturn(List.of(destination));
        when(aiEngineClient.parseDump(any())).thenReturn(response);
        when(placeCardRepository.saveAll(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @SuppressWarnings("unchecked")
    private List<PlaceCard> captureSavedCards() {
        ArgumentCaptor<List<PlaceCard>> captor = ArgumentCaptor.forClass(List.class);
        verify(placeCardRepository).saveAll(captor.capture());
        return captor.getValue();
    }

    private static AiPlaceCardDto placeCard(String name) {
        return new AiPlaceCardDto(
                "place-1", name, "place", "confirmed", "ready_partial",
                false, false, (short) 90, new AiPlaceCardDto.Coordinates(34.6687, 135.5013), "오사카 중앙구",
                null, null, null, null, null, null, null, List.of(), null, null, null);
    }
}
