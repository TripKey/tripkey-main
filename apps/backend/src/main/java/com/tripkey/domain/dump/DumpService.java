package com.tripkey.domain.dump;

import com.tripkey.common.exception.DumpNotFoundException;
import com.tripkey.common.exception.DumpUrlNotAllowedException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.dump.DumpSubmitResponse;
import com.tripkey.dto.dump.ParseJobStatusResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public DumpSubmitResponse submit(UUID tripId, String dumpText) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        if (URL_PATTERN.matcher(dumpText).find()) {
            throw new DumpUrlNotAllowedException();
        }

        DumpJob job = DumpJob.create(tripId, dumpText);
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
}
