package com.tripkey.domain.dump;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.common.exception.DumpNotFoundException;
import com.tripkey.common.exception.DumpUrlNotAllowedException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.dump.DumpSubmitRequest;
import com.tripkey.dto.dump.DumpSubmitResponse;
import com.tripkey.dto.dump.ParseJobStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class DumpService {

    private static final Pattern URL_PATTERN = Pattern.compile(
            "(https?://|www\\.)[\\w\\-._~:/?#\\[\\]@!$&'()*+,;=%]+"
    );

    private final DumpJobRepository dumpJobRepository;
    private final TripRepository tripRepository;
    private final DumpAsyncProcessor dumpAsyncProcessor;
    private final ObjectMapper objectMapper;

    public DumpSubmitResponse submit(UUID tripId, DumpSubmitRequest request) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        String dumpText = request.dumpText();
        if (URL_PATTERN.matcher(dumpText).find()) {
            throw new DumpUrlNotAllowedException();
        }

        DumpJob job = DumpJob.create(
                tripId,
                dumpText,
                serializeFlight(request.departureFlight()),
                serializeFlight(request.returnFlight()),
                serializeAccommodations(request.accommodationInputs()));
        dumpJobRepository.save(job);
        dumpAsyncProcessor.process(job.getJobId());

        return new DumpSubmitResponse(job.getJobId(), job.getStatus());
    }

    @Transactional(readOnly = true)
    public ParseJobStatusResponse getStatus(UUID tripId, UUID jobId) {
        DumpJob job = dumpJobRepository.findByJobIdAndTripId(jobId, tripId)
                .orElseThrow(() -> new DumpNotFoundException(tripId, jobId));

        return new ParseJobStatusResponse(job.getJobId(), job.getStatus(), job.getStep(), job.getErrorCode());
    }

    private String serializeFlight(DumpSubmitRequest.FlightInput flight) {
        if (flight == null) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(flight);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize flight input", e);
        }
    }

    private String serializeAccommodations(List<DumpSubmitRequest.AccommodationInput> accommodations) {
        if (accommodations == null || accommodations.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(accommodations);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize accommodation inputs", e);
        }
    }
}
