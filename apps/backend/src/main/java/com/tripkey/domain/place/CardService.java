package com.tripkey.domain.place;

import com.tripkey.common.exception.CardNotFoundException;
import com.tripkey.common.exception.FlightCardDuplicateRoleException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.dump.DumpJob;
import com.tripkey.domain.dump.DumpJobRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.domain.verify.RouteValidator;
import com.tripkey.dto.card.AlertCardDto;
import com.tripkey.dto.card.CardAddRequest;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.card.CardPatchRequest;
import com.tripkey.dto.card.CardsResponse;
import com.tripkey.dto.placement.RouteWarning;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CardService {

    private final TripRepository tripRepository;
    private final PlaceCardRepository placeCardRepository;
    private final DumpJobRepository dumpJobRepository;
    private final CardInputParsingProcessor cardInputParsingProcessor;
    private final AlertCardRepository alertCardRepository;
    private final RouteValidator routeValidator;

    @Transactional(readOnly = true)
    public CardsResponse getCards(UUID tripId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        List<PlaceCard> placeCards = placeCardRepository.findAllByTripId(tripId);
        List<CardDto> cards = placeCards.stream()
                .sorted(Comparator.comparing(PlaceCard::getCreatedAt))
                .map(CardDto::from)
                .toList();
        Set<UUID> placedInstanceIds = placeCards.stream()
                .filter(card -> card.getDay() != null)
                .map(PlaceCard::getInstanceId)
                .collect(Collectors.toSet());

        String contextSummary = dumpJobRepository
                .findFirstByTripIdOrderByCreatedAtDesc(tripId)
                .map(DumpJob::getContextSummary)
                .orElse(null);

        List<AlertCardDto> alertCards = new ArrayList<>(
                alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(tripId).stream()
                        // 특정 카드에 연결된 알림은 그 카드가 실제 Day에 배치된 경우에만 노출한다.
                        .filter(alert -> alert.relatedInstanceUuids().isEmpty()
                                || alert.relatedInstanceUuids().stream().allMatch(placedInstanceIds::contains))
                        .map(CardService::toAlertCardDto)
                        .toList());
        // Day 단위 conflict(route_warnings)를 scope=day 알림으로 조회 시점에 합성한다(미저장 → 항상 현재 배치 반영).
        routeValidator.validate(tripId).stream()
                .map(CardService::toDayAlertDto)
                .forEach(alertCards::add);

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

        PlaceCard card = isStructuredFlightRequest(request)
                ? PlaceCard.createFlightCard(
                        tripId,
                        request.flightNumber(),
                        request.flightDatetime(),
                        request.flightRole(),
                        request.departureAirport(),
                        request.arrivalAirport())
                : PlaceCard.createUserCard(
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

        String naturalLanguageInput = trimToNull(request.naturalLanguageInput());
        boolean aiRequest = "ai_request".equals(request.parseMode()) && naturalLanguageInput != null;
        if (aiRequest) {
            card.markAiRequestPending();
        }

        // 매뉴얼 카드도 좌표 확보가 필요한 카테고리면 notes/구조화 경로와 동일하게 비동기 재처리(Places lookup)를
        // 트리거한다(좌표 확보 → 종료 상태, 실패 시 #181 패턴). AI 요청 모드는 자연어 원문을 함께 보내
        // card-level parse 가 confirmed/undecided 상태를 결정하게 한다.
        boolean enrich = card.requiresPlacesEnrichment();
        if (!enrich && !aiRequest) {
            card.markProcessingCompleted();
        }
        placeCardRepository.save(card);
        if (enrich || aiRequest) {
            triggerInputParsingAfterCommit(
                    tripId,
                    card.getInstanceId(),
                    aiRequest ? naturalLanguageInput : null
            );
        }
        return CardDto.from(card);
    }

    private static boolean isStructuredFlightRequest(CardAddRequest request) {
        return "transport".equals(request.category())
                && (hasText(request.flightDatetime())
                || hasText(request.flightRole())
                || hasText(request.departureAirport())
                || hasText(request.arrivalAirport()));
    }

    @Transactional
    public CardDto duplicateCard(UUID tripId, UUID instanceId) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }

        PlaceCard original = placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)
                .orElseThrow(() -> new CardNotFoundException(tripId, instanceId));
        PlaceCard duplicate = original.duplicateForPlacement();
        return CardDto.from(placeCardRepository.save(duplicate));
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
        if (request.name() != null || request.estimatedDurationMin() != null) {
            card.updateDisplayFields(request.name(), request.estimatedDurationMin());
        }
        boolean shouldTriggerNotesParsing = notesInput != null && card.canStartNaturalLanguageParsingFromNotes();

        // 구조화 편집: 위치(좌표/장소에 영향)가 실제로 바뀐 경우에만 재처리를 트리거한다.
        // 체크인/체크아웃·시간·편명만 바뀌면 값만 저장(불필요한 processing 강등 방지).
        boolean structuredReprocessNeeded = false;

        boolean accommodationEdit = "accommodation".equals(card.getCategory())
                && (request.location() != null || request.checkIn() != null || request.checkOut() != null);
        if (accommodationEdit) {
            structuredReprocessNeeded |= card.applyAccommodationEdit(
                    request.location(), request.checkIn(), request.checkOut());
        }

        boolean transportEdit = "transport".equals(card.getCategory())
                && (request.location() != null || request.timeConstraint() != null || request.flightNumber() != null);
        if (transportEdit) {
            structuredReprocessNeeded |= card.applyTransportEdit(
                    request.location(), request.timeConstraint(), request.flightNumber());
        }

        // notes 자연어 재파싱이 우선. (FE는 구조화 편집과 notes를 분리 전송)
        if (shouldTriggerNotesParsing) {
            card.markCardLevelParsingStarted();
            placeCardRepository.save(card);
            triggerInputParsingAfterCommit(tripId, instanceId, notesInput);
            return CardDto.from(card);
        }

        // 구조화 위치 변경 → notes 경로와 동일한 비동기 재처리(Places lookup/enrichment) 트리거.
        // naturalLanguageInput=null 이면 AI 가 카드의 구조화 필드 기준으로 재파싱한다.
        if (structuredReprocessNeeded) {
            card.markCardLevelParsingStarted();
            placeCardRepository.save(card);
            triggerInputParsingAfterCommit(tripId, instanceId, null);
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

    private static boolean hasText(String value) {
        return trimToNull(value) != null;
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

    private static AlertCardDto toDayAlertDto(RouteWarning warning) {
        return new AlertCardDto(
                dayAlertId(warning),
                warning.type(),
                "route",
                "day",
                warning.day(),
                warning.message(),
                warning.instanceIds());
    }

    private static String dayAlertId(RouteWarning warning) {
        List<UUID> ids = warning.instanceIds();
        if ("distance".equals(warning.type()) && ids != null && ids.size() >= 2) {
            return "route:distance:" + warning.day() + ":" + ids.get(0) + ":" + ids.get(1);
        }
        return "route:" + warning.type() + ":" + warning.day();
    }
}
