package com.tripkey.domain.chat;

import com.tripkey.common.exception.ChatParseBadRequestException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.chat.ChatCardSaveRequest;
import com.tripkey.dto.chat.ChatCardSaveResponse;
import com.tripkey.dto.chat.ChatContextDto;
import com.tripkey.dto.chat.ChatDuplicateDto;
import com.tripkey.dto.chat.ChatParseRequest;
import com.tripkey.dto.chat.ChatParseResponse;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiChatParseRequest;
import com.tripkey.infra.aiengine.dto.AiChatParseResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChatParseService {

    private static final int DEFAULT_MAX_CARDS = 3;
    private static final int MAX_CONTEXT_ITEMS = 20;
    private static final int MAX_CONTEXT_ITEM_LENGTH = 100;
    private static final String DUPLICATE_ONLY_REPLY =
            "이미 저장된 장소예요. 같은 장소를 일정에 여러 번 넣고 싶다면 배치 화면에서 카드를 복제할 수 있어요.";

    private final TripRepository tripRepository;
    private final TripDestinationRepository tripDestinationRepository;
    private final PlaceCardRepository placeCardRepository;
    private final AiEngineClient aiEngineClient;
    private final ChatRecommendedCardWriter cardWriter;

    public ChatParseResponse parse(UUID tripId, ChatParseRequest request) {
        NormalizedRequest normalized = normalize(request);
        Trip trip = tripRepository.findById(tripId)
                .orElseThrow(() -> new TripNotFoundException(tripId));

        List<String> destinations = tripDestinationRepository
                .findByTripTripIdOrderBySortOrder(tripId).stream()
                .map(TripDestination::getName)
                .distinct()
                .toList();

        List<AiChatParseRequest.ExistingCard> existingCards = placeCardRepository
                .findAllByTripId(tripId).stream()
                .filter(card -> !Boolean.TRUE.equals(card.getIsExcluded()))
                .map(card -> new AiChatParseRequest.ExistingCard(
                        card.getName(), card.getCategory(), card.getLocation(), card.getPlaceId()))
                .toList();

        AiChatParseResponse aiResponse = aiEngineClient.parseChat(new AiChatParseRequest(
                tripId,
                normalized.message(),
                destinations,
                trip.getTravelDays(),
                trip.getCompanionCount(),
                normalized.context(),
                existingCards,
                normalized.maxCards()
        ));

        ChatContextDto updatedContext = normalizeAiContext(aiResponse.updatedContext(), normalized.context());
        List<ChatDuplicateDto> aiDuplicates = normalizeAiDuplicates(aiResponse.duplicates());
        if (!"generate_cards".equals(aiResponse.intent()) || aiResponse.cards() == null || aiResponse.cards().isEmpty()) {
            String reply = aiDuplicates.isEmpty() ? aiResponse.reply() : DUPLICATE_ONLY_REPLY;
            return new ChatParseResponse(
                    aiResponse.intent(), reply, updatedContext, List.of(), aiDuplicates);
        }

        ChatSuggestionResult suggestionResult = cardWriter.prepareSuggestions(tripId, aiResponse.cards());
        List<ChatDuplicateDto> duplicates = mergeDuplicates(aiDuplicates, suggestionResult.duplicates());
        String reply = suggestionResult.suggestions().isEmpty() && !duplicates.isEmpty()
                ? DUPLICATE_ONLY_REPLY
                : aiResponse.reply();
        return new ChatParseResponse(
                aiResponse.intent(), reply, updatedContext, suggestionResult.suggestions(), duplicates);
    }

    public ChatCardSaveResponse saveCards(UUID tripId, ChatCardSaveRequest request) {
        if (!tripRepository.existsById(tripId)) {
            throw new TripNotFoundException(tripId);
        }
        if (request == null || request.cards() == null || request.cards().isEmpty()) {
            throw new ChatParseBadRequestException("저장할 추천 카드를 선택해주세요");
        }
        if (request.cards().size() > MAX_CONTEXT_ITEMS) {
            throw new ChatParseBadRequestException("추천 카드는 한 번에 최대 20개까지 저장할 수 있어요");
        }
        ChatCardWriteResult result = cardWriter.saveSelectedCards(tripId, request.cards());
        List<CardDto> createdCards = result.savedCards().stream().map(CardDto::from).toList();
        return new ChatCardSaveResponse(createdCards, result.duplicates());
    }

    private static NormalizedRequest normalize(ChatParseRequest request) {
        if (request == null || request.message() == null || request.message().trim().isEmpty()) {
            throw new ChatParseBadRequestException("message는 비어 있을 수 없어요");
        }
        String message = request.message().trim();
        if (message.length() > 500) {
            throw new ChatParseBadRequestException("message는 최대 500자까지 입력할 수 있어요");
        }

        int maxCards = request.maxCards() == null ? DEFAULT_MAX_CARDS : request.maxCards();
        if (maxCards <= 0) {
            throw new ChatParseBadRequestException("max_cards는 1 이상이어야 해요");
        }
        maxCards = Math.min(maxCards, DEFAULT_MAX_CARDS);

        ChatContextDto context = request.context() == null
                ? new ChatContextDto(List.of(), List.of())
                : new ChatContextDto(
                        normalizeContextItems(request.context().interests(), "context.interests", true),
                        normalizeContextItems(request.context().constraints(), "context.constraints", true));
        return new NormalizedRequest(message, context, maxCards);
    }

    private static ChatContextDto normalizeAiContext(ChatContextDto value, ChatContextDto fallback) {
        if (value == null) {
            return fallback;
        }
        return new ChatContextDto(
                normalizeContextItems(value.interests(), "updated_context.interests", false),
                normalizeContextItems(value.constraints(), "updated_context.constraints", false));
    }

    private static List<String> normalizeContextItems(List<String> items, String field, boolean rejectOversize) {
        if (items == null) {
            return List.of();
        }
        if (rejectOversize && items.size() > MAX_CONTEXT_ITEMS) {
            throw new ChatParseBadRequestException(field + "는 최대 20개까지 입력할 수 있어요");
        }
        List<String> result = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (String item : items) {
            if (item == null) {
                if (rejectOversize) {
                    throw new ChatParseBadRequestException(field + " 항목은 문자열이어야 해요");
                }
                continue;
            }
            String trimmed = item.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            if (trimmed.length() > MAX_CONTEXT_ITEM_LENGTH) {
                if (rejectOversize) {
                    throw new ChatParseBadRequestException(field + " 항목은 최대 100자까지 입력할 수 있어요");
                }
                continue;
            }
            String key = trimmed.toLowerCase(Locale.ROOT);
            if (seen.add(key)) {
                result.add(trimmed);
                if (result.size() == MAX_CONTEXT_ITEMS) {
                    break;
                }
            }
        }
        return List.copyOf(result);
    }

    private static List<ChatDuplicateDto> normalizeAiDuplicates(List<AiChatParseResponse.Duplicate> values) {
        if (values == null) {
            return List.of();
        }
        List<ChatDuplicateDto> result = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        for (AiChatParseResponse.Duplicate value : values) {
            if (value == null || value.name() == null || value.name().isBlank()
                    || !"already_exists".equals(value.reason())) {
                continue;
            }
            String name = value.name().trim();
            if (seen.add(name.toLowerCase(Locale.ROOT))) {
                result.add(ChatDuplicateDto.alreadyExists(name));
            }
        }
        return List.copyOf(result);
    }

    private static List<ChatDuplicateDto> mergeDuplicates(
            List<ChatDuplicateDto> aiDuplicates,
            List<ChatDuplicateDto> backendDuplicates
    ) {
        List<ChatDuplicateDto> result = new ArrayList<>();
        Set<String> seenNames = new HashSet<>();
        for (ChatDuplicateDto duplicate : concat(aiDuplicates, backendDuplicates)) {
            if (duplicate == null || duplicate.name() == null || duplicate.name().isBlank()) {
                continue;
            }
            String key = duplicate.name().trim().toLowerCase(Locale.ROOT);
            if (seenNames.add(key)) {
                result.add(ChatDuplicateDto.alreadyExists(duplicate.name().trim()));
            }
        }
        return List.copyOf(result);
    }

    private static List<ChatDuplicateDto> concat(
            List<ChatDuplicateDto> first,
            List<ChatDuplicateDto> second
    ) {
        List<ChatDuplicateDto> values = new ArrayList<>(first.size() + second.size());
        values.addAll(first);
        values.addAll(second);
        return values;
    }

    private record NormalizedRequest(String message, ChatContextDto context, int maxCards) {
    }
}
