package com.tripkey.domain.chat;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.dto.chat.ChatDuplicateDto;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class ChatRecommendedCardWriter {

    private final PlaceCardRepository placeCardRepository;

    @Transactional
    public ChatCardWriteResult saveRecommendedCards(UUID tripId, List<AiPlaceCardDto> candidates) {
        Set<String> seenPlaceIds = new HashSet<>();
        placeCardRepository.findAllByTripId(tripId).stream()
                .filter(card -> !Boolean.TRUE.equals(card.getIsExcluded()))
                .map(PlaceCard::getPlaceId)
                .filter(ChatRecommendedCardWriter::hasText)
                .map(String::trim)
                .forEach(seenPlaceIds::add);

        List<PlaceCard> toSave = new ArrayList<>();
        List<ChatDuplicateDto> duplicates = new ArrayList<>();
        Set<String> duplicatePlaceIds = new HashSet<>();

        for (AiPlaceCardDto dto : candidates == null ? List.<AiPlaceCardDto>of() : candidates) {
            if (!isValidResolvedPlace(dto)) {
                log.warn("Dropping invalid resolved chat card. name={} placeId={}",
                        dto == null ? null : dto.name(), dto == null ? null : dto.placeId());
                continue;
            }

            String placeId = dto.placeId().trim();
            if (seenPlaceIds.contains(placeId)) {
                if (duplicatePlaceIds.add(placeId)) {
                    duplicates.add(ChatDuplicateDto.alreadyExists(dto.name()));
                }
                continue;
            }

            AiPlaceCardDto corrected = corrected(dto, placeId);
            PlaceCard card = PlaceCard.createFromAiResponse(tripId, corrected, "ai_recommend");
            card.markProcessingCompleted();
            toSave.add(card);
            seenPlaceIds.add(placeId);
        }

        List<PlaceCard> saved = toSave.isEmpty() ? List.of() : placeCardRepository.saveAll(toSave);
        return new ChatCardWriteResult(List.copyOf(saved), List.copyOf(duplicates));
    }

    private static boolean isValidResolvedPlace(AiPlaceCardDto dto) {
        if (dto == null || !hasText(dto.placeId()) || dto.coordinates() == null) {
            return false;
        }
        Double lat = dto.coordinates().lat();
        Double lng = dto.coordinates().lng();
        return lat != null && lng != null
                && Double.isFinite(lat) && Double.isFinite(lng)
                && lat >= -90 && lat <= 90
                && lng >= -180 && lng <= 180;
    }

    private static AiPlaceCardDto corrected(AiPlaceCardDto dto, String placeId) {
        return new AiPlaceCardDto(
                placeId,
                dto.name(),
                dto.category(),
                "open_question",
                "ready",
                true,
                dto.allowDuplicate(),
                dto.estimatedDurationMin(),
                dto.coordinates(),
                dto.location(),
                dto.address(),
                dto.timeConstraint(),
                dto.userContext(),
                dto.tips(),
                null,
                null,
                dto.blockedReason(),
                dto.tags(),
                dto.checkIn(),
                dto.checkOut(),
                dto.flightNumber(),
                dto.flightDatetime(),
                dto.flightRole(),
                dto.searchAlias()
        );
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
