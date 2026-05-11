package com.tripkey.domain.place;

import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiCardParseRequest;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CardInputParsingProcessorTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private TripDestinationRepository tripDestinationRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @Mock
    private AiEngineClient aiEngineClient;

    @InjectMocks
    private CardInputParsingProcessor processor;

    @Test
    void parseAndEnrichConfirmsCardAndStoresPlaceLookupResult() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        PlaceCard card = needsInputCard(tripId);

        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)).thenReturn(Optional.of(card));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of());
        when(aiEngineClient.parseCard(any(AiCardParseRequest.class))).thenReturn(parsedCard());

        processor.parseAndEnrich(tripId, instanceId, "도톤보리 글리코 사인으로 가자");

        assertThat(card.getClassification()).isEqualTo("confirmed");
        assertThat(card.getPlacementStatus()).isEqualTo("ready_partial");
        assertThat(card.getProcessingStatus()).isEqualTo("completed");
        assertThat(card.getQuestionText()).isNull();
        assertThat(card.getOptions()).isNull();
        assertThat(card.getPlaceId()).isEqualTo("place-1");
        assertThat(card.getLat()).isEqualTo(34.6687);
        assertThat(card.getLng()).isEqualTo(135.5011);
        assertThat(card.getAddress()).isEqualTo("1 Chome Dotonbori, Osaka");
        assertThat(card.getSearchAlias()).isEqualTo("Dotonbori Glico Sign");
        verify(placeCardRepository).save(card);
    }

    @Test
    void parseAndEnrichMarksConfirmedCardFailedWhenPlaceLookupMisses() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        PlaceCard card = needsInputCard(tripId);

        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)).thenReturn(Optional.of(card));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of());
        when(aiEngineClient.parseCard(any(AiCardParseRequest.class))).thenReturn(parsedCardWithoutPlaceLookup());

        processor.parseAndEnrich(tripId, instanceId, "도톤보리 글리코 사인으로 가자");

        assertThat(card.getClassification()).isEqualTo("confirmed");
        assertThat(card.getPlacementStatus()).isEqualTo("ready_partial");
        assertThat(card.getProcessingStatus()).isEqualTo("failed");
        assertThat(card.getPlaceId()).isNull();
        assertThat(card.getLat()).isNull();
        assertThat(card.getLng()).isNull();
        assertThat(card.getAddress()).isNull();
        verify(placeCardRepository).save(card);
    }

    @Test
    void parseAndEnrichKeepsExistingCardAndMarksFailedWhenAiReturnsNonConfirmed() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        PlaceCard card = needsInputCard(tripId);

        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)).thenReturn(Optional.of(card));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of());
        when(aiEngineClient.parseCard(any(AiCardParseRequest.class))).thenReturn(nonConfirmedParsedCard());

        processor.parseAndEnrich(tripId, instanceId, "아무데나 갈래");

        assertThat(card.getClassification()).isEqualTo("undecided");
        assertThat(card.getPlacementStatus()).isEqualTo("needs_input");
        assertThat(card.getProcessingStatus()).isEqualTo("failed");
        assertThat(card.getName()).isEqualTo("친구집");
        assertThat(card.getQuestionText()).isEqualTo("친구집 위치를 알려주세요");
        verify(placeCardRepository).save(card);
    }

    @Test
    void parseAndEnrichMarksFailedWithoutRollingBackExistingCardWhenAiFails() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        PlaceCard card = needsInputCard(tripId);

        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)).thenReturn(Optional.of(card));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of());
        when(aiEngineClient.parseCard(any(AiCardParseRequest.class))).thenThrow(new IllegalStateException("AI down"));

        processor.parseAndEnrich(tripId, instanceId, "도톤보리 글리코 사인으로 가자");

        assertThat(card.getClassification()).isEqualTo("undecided");
        assertThat(card.getPlacementStatus()).isEqualTo("needs_input");
        assertThat(card.getProcessingStatus()).isEqualTo("failed");
        assertThat(card.getName()).isEqualTo("친구집");
        verify(placeCardRepository).save(card);
    }

    @Test
    void parseAndEnrichPassesNaturalLanguageInputAndSnapshotToAiEngine() {
        UUID tripId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        Trip trip = new Trip((short) 3, (short) 2);
        PlaceCard card = needsInputCard(tripId);

        when(placeCardRepository.findByInstanceIdAndTripId(instanceId, tripId)).thenReturn(Optional.of(card));
        when(tripRepository.findById(tripId)).thenReturn(Optional.of(trip));
        when(tripDestinationRepository.findByTripTripIdOrderBySortOrder(tripId)).thenReturn(List.of());
        when(aiEngineClient.parseCard(any(AiCardParseRequest.class))).thenReturn(parsedCardWithoutPlaceLookup());

        processor.parseAndEnrich(tripId, instanceId, "난바역 근처 친구 집이야");

        ArgumentCaptor<AiCardParseRequest> captor = ArgumentCaptor.forClass(AiCardParseRequest.class);
        verify(aiEngineClient).parseCard(captor.capture());
        assertThat(captor.getValue().naturalLanguageInput()).isEqualTo("난바역 근처 친구 집이야");
        assertThat(captor.getValue().card().name()).isEqualTo("친구집");
        assertThat(captor.getValue().card().classification()).isEqualTo("undecided");
    }

    private PlaceCard needsInputCard(UUID tripId) {
        AiPlaceCardDto dto = new AiPlaceCardDto(
                null, "친구집", "place", "undecided", "needs_input",
                false, false, null, null, null, null, null, null, null,
                "친구집 위치를 알려주세요", null, null, null, null, null, null, null, null, null
        );
        return PlaceCard.createFromAiResponse(tripId, dto, "ai_parse");
    }

    private AiPlaceCardDto parsedCard() {
        return new AiPlaceCardDto(
                "place-1",
                "도톤보리 글리코 사인",
                "place",
                "confirmed",
                "ready_partial",
                false,
                false,
                (short) 60,
                new AiPlaceCardDto.Coordinates(34.6687, 135.5011),
                "오사카 난바",
                "1 Chome Dotonbori, Osaka",
                null,
                "사용자가 직접 입력한 도톤보리 방문지",
                "저녁 시간대에 사진 찍기 좋아요",
                null,
                null,
                null,
                List.of("landmark"),
                null,
                null,
                null,
                null,
                null,
                "Dotonbori Glico Sign"
        );
    }

    private AiPlaceCardDto parsedCardWithoutPlaceLookup() {
        return new AiPlaceCardDto(
                null,
                "도톤보리 글리코 사인",
                "place",
                "confirmed",
                "ready_partial",
                false,
                false,
                (short) 60,
                null,
                "오사카 난바",
                null,
                null,
                "사용자가 직접 입력한 도톤보리 방문지 장소 정보를 확인해주세요.",
                "저녁 시간대에 사진 찍기 좋아요",
                null,
                null,
                null,
                List.of("landmark"),
                null,
                null,
                null,
                null,
                null,
                "Dotonbori Glico Sign"
        );
    }

    private AiPlaceCardDto nonConfirmedParsedCard() {
        return new AiPlaceCardDto(
                null, "아무데나", "etc", "undecided", "needs_input",
                false, false, null, null, null, null, null, null, null,
                "장소를 더 구체적으로 알려주세요", null, null, null, null, null, null, null, null, null
        );
    }
}
