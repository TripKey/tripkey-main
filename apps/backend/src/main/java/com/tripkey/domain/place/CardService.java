package com.tripkey.domain.place;

import com.tripkey.common.exception.CardNotFoundException;
import com.tripkey.common.exception.FlightCardDuplicateRoleException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.dump.DumpJob;
import com.tripkey.domain.dump.DumpJobRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.AlertCardDto;
import com.tripkey.dto.card.CardAddRequest;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.card.CardPatchRequest;
import com.tripkey.dto.card.CardsResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CardService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final DumpJobRepository dumpJobRepository;
    private final CardInputParsingProcessor cardInputParsingProcessor;
    private final AlertCardRepository alertCardRepository;

    @Transactional(readOnly = true)
    public CardsResponse getCards(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<CardDto> cards = placeCardRepository.findAllByTripId(tripId).stream()
                .sorted(Comparator.comparing(PlaceCard::getCreatedAt))
                .map(CardDto::from)
                .toList();

        String contextSummary = dumpJobRepository
                .findFirstByTripIdOrderByCreatedAtDesc(tripId)
                .map(DumpJob::getContextSummary)
                .orElse(null);

        List<AlertCardDto> alertCards = alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(tripId).stream()
                .map(CardService::toAlertCardDto)
                .toList();

        return new CardsResponse(cards, contextSummary, alertCards);
    }

    @Transactional
    public CardDto addCard(UUID tripId, CardAddRequest request) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        if ("transport".equals(request.category())
                && request.flightNumber() != null
                && !request.flightNumber().isBlank()
                && placeCardRepository.existsByTripIdAndCategoryAndFlightNumber(
                        tripId, "transport", request.flightNumber().trim())) {
            throw new FlightCardDuplicateRoleException();
        }

        PlaceCard card = PlaceCard.createUserCard(
                tripId,
                request.name(),
                request.category(),
                request.location(),
                request.estimatedDurationMin(),
                request.timeConstraint(),
                request.memo(),
                request.checkIn(),
                request.checkOut(),
                request.flightNumber());
        placeCardRepository.save(card);
        return CardDto.from(card);
    }

    @Transactional
    public CardDto patchCard(UUID tripId, UUID instanceId, CardPatchRequest request) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        PlaceCard card = placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)
                .orElseThrow(() -> new CardNotFoundException(tripId, instanceId));

        if (request.classification() != null) {
            card.changeClassification(request.classification());
        }
        if (request.isExcluded() != null) {
            card.setExcluded(request.isExcluded());
        }
        if (request.allowDuplicate() != null) {
            card.setAllowDuplicate(request.allowDuplicate());
        }
        String notesInput = trimToNull(request.notes());
        if (request.notes() != null) {
            card.updateNotes(request.notes());
        }
        if (request.memo() != null) {
            card.updateMemo(request.memo());
        }
        boolean shouldTriggerNotesParsing = notesInput != null && card.canStartNaturalLanguageParsingFromNotes();

        boolean accommodationEdit = "accommodation".equals(card.getCategory())
                && (request.location() != null || request.checkIn() != null || request.checkOut() != null);
        if (accommodationEdit) {
            card.applyAccommodationEdit(request.location(), request.checkIn(), request.checkOut());
        }

        boolean transportEdit = "transport".equals(card.getCategory())
                && (request.location() != null || request.timeConstraint() != null || request.flightNumber() != null);
        if (transportEdit) {
            card.applyTransportEdit(request.location(), request.timeConstraint(), request.flightNumber());
        }

        if (shouldTriggerNotesParsing) {
            card.markCardLevelParsingStarted();
            placeCardRepository.save(card);
            triggerInputParsingAfterCommit(tripId, instanceId, notesInput);
            return CardDto.from(card);
        }

        placeCardRepository.save(card);
        return CardDto.from(card);
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void triggerInputParsingAfterCommit(UUID tripId, UUID instanceId, String naturalLanguageInput) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            cardInputParsingProcessor.parseAndEnrich(tripId, instanceId, naturalLanguageInput);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                cardInputParsingProcessor.parseAndEnrich(tripId, instanceId, naturalLanguageInput);
            }
        });
    }

    private static AlertCardDto toAlertCardDto(AlertCard entity) {
        return new AlertCardDto(
                entity.getAlertId(),
                entity.getType(),
                entity.getCategory(),
                entity.getScope(),
                entity.getDay() == null ? null : entity.getDay().intValue(),
                entity.getMessage(),
                entity.relatedInstanceUuids());
    }
}
