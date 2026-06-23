package com.tripkey.domain.dump;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.dump.DumpSubmitRequest;
import com.tripkey.dto.dump.DumpSubmitResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DumpServiceTest {

    @Mock
    private DumpJobRepository dumpJobRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private TripRepository tripRepository;

    @Mock
    private DumpAsyncProcessor dumpAsyncProcessor;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private DumpService dumpService;

    @Test
    void submitStartsAsyncParseAfterCreatingDumpJob() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DumpSubmitRequest req = new DumpSubmitRequest("오사카 3박4일 여행입니다.", null, null, null);
        DumpSubmitResponse response = dumpService.submit(tripId, req);

        ArgumentCaptor<DumpJob> jobCaptor = ArgumentCaptor.forClass(DumpJob.class);
        verify(dumpJobRepository).save(jobCaptor.capture());
        verify(dumpAsyncProcessor).process(response.jobId());

        DumpJob savedJob = jobCaptor.getValue();
        assertThat(savedJob.getTripId()).isEqualTo(tripId);
        assertThat(response.jobId()).isEqualTo(savedJob.getJobId());
        assertThat(response.status()).isEqualTo("pending");
    }

    @Test
    void submitStoresStructuredFlightsOnDumpJob() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        org.mockito.ArgumentCaptor<DumpJob> jobCaptor = org.mockito.ArgumentCaptor.forClass(DumpJob.class);
        when(dumpJobRepository.save(jobCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        DumpSubmitRequest.FlightInput dep =
                new DumpSubmitRequest.FlightInput("ICN", "NRT", "KE703", "2026-07-01T09:00:00+09:00");
        DumpSubmitRequest req = new DumpSubmitRequest("오사카 3박4일 여행입니다.", dep, null, null);

        dumpService.submit(tripId, req);

        DumpJob saved = jobCaptor.getValue();
        assertThat(saved.getDepartureFlight()).contains("ICN").contains("KE703");
        assertThat(saved.getReturnFlight()).isNull();
    }

    @Test
    void submitStoresStructuredAccommodationsOnDumpJob() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        ArgumentCaptor<DumpJob> jobCaptor = ArgumentCaptor.forClass(DumpJob.class);
        when(dumpJobRepository.save(jobCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        DumpSubmitRequest.AccommodationInput hotel =
                new DumpSubmitRequest.AccommodationInput(
                        "호텔 그란비아 오사카", "오사카", "2026-07-01", "2026-07-03");
        DumpSubmitRequest req = new DumpSubmitRequest(
                "오사카 3박4일 여행입니다.", null, null, List.of(hotel));

        dumpService.submit(tripId, req);

        DumpJob saved = jobCaptor.getValue();
        assertThat(saved.getAccommodationInputs())
                .contains("호텔 그란비아 오사카")
                .contains("check_in")
                .contains("2026-07-01");
    }

    @Test
    void submitLeavesAccommodationsNullWhenEmpty() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        ArgumentCaptor<DumpJob> jobCaptor = ArgumentCaptor.forClass(DumpJob.class);
        when(dumpJobRepository.save(jobCaptor.capture())).thenAnswer(inv -> inv.getArgument(0));

        DumpSubmitRequest req = new DumpSubmitRequest(
                "오사카 3박4일 여행입니다.", null, null, List.of());

        dumpService.submit(tripId, req);

        assertThat(jobCaptor.getValue().getAccommodationInputs()).isNull();
    }
}
