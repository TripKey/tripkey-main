package com.tripkey.domain.dump;

import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
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
    private AiEngineClient aiEngineClient;

    @Mock
    private NonBlockingEnrichmentProcessor nonBlockingEnrichmentProcessor;

    @InjectMocks
    private DumpAsyncProcessor dumpAsyncProcessor;

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
        verify(placeCardRepository).saveAll(any());
        verify(nonBlockingEnrichmentProcessor).trigger(any(), any(), any());

        assertThat(job.getStatus()).isEqualTo("completed");
        assertThat(job.getStep()).isEqualTo((short) 3);
        assertThat(job.getContextSummary()).isEqualTo("오사카 시내 중심 동선");
        assertThat(job.getErrorCode()).isNull();
    }

    @Test
    void processCompletesWhenNonBlockingEnrichmentSubmissionFails() {
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
                null,
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
        doThrow(new IllegalStateException("executor rejected"))
                .when(nonBlockingEnrichmentProcessor).trigger(any(), any(), any());

        dumpAsyncProcessor.process(job.getJobId());

        verify(nonBlockingEnrichmentProcessor).trigger(any(), any(), any());
        assertThat(job.getStatus()).isEqualTo("completed");
        assertThat(job.getErrorCode()).isNull();
    }
}
