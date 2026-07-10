package com.tripkey.domain.chat;

import com.tripkey.common.exception.ChatParseBadRequestException;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.chat.ChatContextDto;
import com.tripkey.dto.chat.ChatDuplicateDto;
import com.tripkey.dto.chat.ChatParseRequest;
import com.tripkey.dto.chat.ChatParseResponse;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiChatParseRequest;
import com.tripkey.infra.aiengine.dto.AiChatParseResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatParseServiceTest {

    @Mock TripRepository tripRepository;
    @Mock TripDestinationRepository tripDestinationRepository;
    @Mock PlaceCardRepository placeCardRepository;
    @Mock AiEngineClient aiEngineClient;
    @Mock ChatRecommendedCardWriter cardWriter;

    private ChatParseService service;

    @BeforeEach
    void setUp() {
        service = new ChatParseService(
                tripRepository, tripDestinationRepository, placeCardRepository, aiEngineClient, cardWriter);
    }

    @Test
    void validatesInputBeforeCallingAiEngine() {
        UUID tripId = UUID.randomUUID();

        assertThatThrownBy(() -> service.parse(tripId, new ChatParseRequest(" ", null, 3)))
                .isInstanceOf(ChatParseBadRequestException.class);
        assertThatThrownBy(() -> service.parse(tripId, new ChatParseRequest("추천해줘", null, 0)))
                .isInstanceOf(ChatParseBadRequestException.class);
        assertThatThrownBy(() -> service.parse(
                tripId,
                new ChatParseRequest("추천해줘", new ChatContextDto(List.of("x".repeat(101)), null), 3)))
                .isInstanceOf(ChatParseBadRequestException.class);

        verify(aiEngineClient, never()).parseChat(any());
    }

    @Test
    void normalizesRequestAndDoesNotWriteForNonGenerateIntent() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(new Trip((short) 3, (short) 2)));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(aiEngineClient.parseChat(any())).thenReturn(new AiChatParseResponse(
                "update_context", "반영할게요.",
                new ChatContextDto(List.of("food"), List.of("low_walking")),
                List.of(), List.of()));

        ChatParseResponse response = service.parse(
                tripId,
                new ChatParseRequest(
                        "  많이 걷고 싶지 않아  ",
                        new ChatContextDto(List.of(" food ", "FOOD", " "), null),
                        99));

        ArgumentCaptor<AiChatParseRequest> captor = ArgumentCaptor.forClass(AiChatParseRequest.class);
        verify(aiEngineClient).parseChat(captor.capture());
        assertThat(captor.getValue().message()).isEqualTo("많이 걷고 싶지 않아");
        assertThat(captor.getValue().maxCards()).isEqualTo(3);
        assertThat(captor.getValue().context().interests()).containsExactly("food");
        assertThat(captor.getValue().context().constraints()).isEmpty();
        assertThat(response.createdCards()).isEmpty();
        verify(cardWriter, never()).saveRecommendedCards(any(), any());
    }

    @Test
    void mergesAiDuplicatesBeforeWriterDuplicates() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(new Trip((short) 3, (short) 2)));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of());
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());
        when(aiEngineClient.parseChat(any())).thenReturn(new AiChatParseResponse(
                "generate_cards", "찾아봤어요.", new ChatContextDto(List.of(), List.of()),
                List.of(new com.tripkey.infra.aiengine.dto.AiPlaceCardDto(
                        "place-1", "새 장소", "place", "open_question", "ready", true, false,
                        null, new com.tripkey.infra.aiengine.dto.AiPlaceCardDto.Coordinates(1.0, 1.0),
                        null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null)),
                List.of(new AiChatParseResponse.Duplicate("기존 장소", "already_exists"))));
        when(cardWriter.saveRecommendedCards(any(), any())).thenReturn(new ChatCardWriteResult(
                List.of(),
                List.of(ChatDuplicateDto.alreadyExists("기존 장소"), ChatDuplicateDto.alreadyExists("다른 장소"))));

        ChatParseResponse response = service.parse(tripId, new ChatParseRequest("추천해줘", null, null));

        assertThat(response.duplicates()).extracting(ChatDuplicateDto::name)
                .containsExactly("기존 장소", "다른 장소");
    }
}
