package com.tripkey.domain.dump;

import com.tripkey.common.exception.DumpNotCompletedException;
import com.tripkey.common.exception.DumpNotFoundException;
import com.tripkey.common.exception.DumpUrlNotAllowedException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.dump.DumpResultResponse;
import com.tripkey.dto.dump.DumpStatusResponse;
import com.tripkey.dto.dump.DumpSubmitResponse;
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
    private final PlaceCardRepository placeCardRepository;
    private final TripRepository tripRepository;

    @Transactional
    public DumpSubmitResponse submit(UUID tripId, String dumpText) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        if (URL_PATTERN.matcher(dumpText).find()) {
            throw new DumpUrlNotAllowedException();
        }

        DumpJob job = DumpJob.create(tripId, dumpText);
        dumpJobRepository.save(job);

        // TODO: AI Engine 비동기 호출 (파싱 요청)

        return new DumpSubmitResponse(job.getJobId(), job.getStatus());
    }

    @Transactional(readOnly = true)
    public DumpStatusResponse getStatus(UUID tripId) {
        DumpJob job = dumpJobRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId)
                .orElseThrow(() -> new DumpNotFoundException(tripId));

        return new DumpStatusResponse(job.getJobId(), job.getStatus(), job.getStep(), job.getErrorCode());
    }

    @Transactional(readOnly = true)
    public DumpResultResponse getResult(UUID tripId) {
        DumpJob job = dumpJobRepository.findFirstByTripIdOrderByCreatedAtDesc(tripId)
                .orElseThrow(() -> new DumpNotFoundException(tripId));

        if (!"completed".equals(job.getStatus())) {
            throw new DumpNotCompletedException();
        }

        List<PlaceCard> cards = placeCardRepository.findAllByTripId(tripId);

        List<DumpResultResponse.PlaceCardDto> cardDtos = cards.stream()
                .map(c -> new DumpResultResponse.PlaceCardDto(
                        c.getInstanceId(),
                        c.getPlaceId(),
                        c.getStatus(),
                        c.getName(),
                        c.getCategory(),
                        c.getClassification(),
                        c.getEstimatedDurationMin(),
                        c.getTimeConstraint(),
                        c.getIsAiGenerated(),
                        c.getConflictType(),
                        c.getConflictReason(),
                        c.getRemind(),
                        (c.getLat() != null && c.getLng() != null)
                                ? new DumpResultResponse.CoordinatesDto(c.getLat(), c.getLng())
                                : null
                ))
                .toList();

        // TODO: AlertCard 로직 구현 후 실제 데이터로 교체
        List<DumpResultResponse.AlertCardDto> alertCards = List.of();

        return new DumpResultResponse(
                cardDtos,
                job.getContextSummary(),
                alertCards
        );
    }
}
