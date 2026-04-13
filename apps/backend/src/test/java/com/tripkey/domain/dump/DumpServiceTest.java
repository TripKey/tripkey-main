package com.tripkey.domain.dump;

import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.dump.DumpSubmitResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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

    @InjectMocks
    private DumpService dumpService;

    @Test
    void submitStartsAsyncParseAfterCreatingDumpJob() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(dumpJobRepository.save(any(DumpJob.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DumpSubmitResponse response = dumpService.submit(tripId, "오사카 3박4일 여행입니다.");

        ArgumentCaptor<DumpJob> jobCaptor = ArgumentCaptor.forClass(DumpJob.class);
        verify(dumpJobRepository).save(jobCaptor.capture());
        verify(dumpAsyncProcessor).process(response.jobId());

        DumpJob savedJob = jobCaptor.getValue();
        assertThat(savedJob.getTripId()).isEqualTo(tripId);
        assertThat(response.jobId()).isEqualTo(savedJob.getJobId());
        assertThat(response.status()).isEqualTo("pending");
    }
}
