package com.tripkey.domain.confirm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.tripkey.common.exception.ConfirmSummaryNotFoundException;
import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.dto.confirm.ConfirmSummaryResponse;
import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.dto.placement.RouteWarning;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfirmSummaryServiceTest {

    private final com.tripkey.domain.trip.TripRepository tripRepository =
            mock(com.tripkey.domain.trip.TripRepository.class);
    private final PlaceCardRepository placeCardRepository =
            mock(PlaceCardRepository.class);
    private final ConfirmSummaryRepository confirmSummaryRepository =
            mock(ConfirmSummaryRepository.class);
    private final ObjectMapper objectMapper = new ObjectMapper()
            .setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
    private final ConfirmSummaryService service =
            new ConfirmSummaryService(tripRepository, placeCardRepository, confirmSummaryRepository, objectMapper);

    @Test
    void getConfirmSummaryReturnsStoredSnapshot() {
        UUID tripId = UUID.randomUUID();
        ConfirmSummary summary = ConfirmSummary.createRuleBased(
                tripId,
                "{\"trip_checklist\":[],\"days\":[{\"day\":1,\"checklist\":[]}]}"
        );
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(confirmSummaryRepository.findById(tripId)).thenReturn(Optional.of(summary));

        ConfirmSummaryResponse response = service.getConfirmSummary(tripId);

        assertThat(response.tripId()).isEqualTo(tripId);
        assertThat(response.status()).isEqualTo("completed");
        assertThat(response.generationMode()).isEqualTo("rule_based");
        assertThat(response.summary().get("trip_checklist").isArray()).isTrue();
        assertThat(response.summary().get("days").get(0).get("day").asInt()).isEqualTo(1);
        assertThat(response.generatedAt()).isNotNull();
    }

    @Test
    void getConfirmSummaryThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        assertThatThrownBy(() -> service.getConfirmSummary(tripId))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void getConfirmSummaryThrowsSummaryNotFoundWhenSnapshotMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(confirmSummaryRepository.findById(tripId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getConfirmSummary(tripId))
                .isInstanceOf(ConfirmSummaryNotFoundException.class);
    }

    @Test
    void generateRuleBasedSummaryStoresChecklistSnapshot() throws Exception {
        UUID tripId = UUID.randomUUID();
        PlaceCard hotel = placeCard(tripId, "난바 호텔", "accommodation", 1, 1);
        setField(hotel, "userContext", "체크인 이후 난바 근처를 잡았어요.");
        setField(hotel, "tips", "숙소 바우처를 모바일에 저장해두면 좋아요.");
        UUID nextId = UUID.randomUUID();
        RouteWarning warning = RouteWarning.distance(1, hotel.getInstanceId(), nextId, 12_000);
        RouteLeg leg = new RouteLeg(1, hotel.getInstanceId(), nextId, 900, 12_000, "transit", "google");

        when(tripRepository.findById(tripId)).thenReturn(Optional.of(new Trip((short) 2, (short) 2)));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(hotel));
        when(confirmSummaryRepository.findById(tripId)).thenReturn(Optional.empty());
        when(confirmSummaryRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ConfirmSummary summary = service.generateRuleBasedSummary(
                tripId,
                List.of(warning),
                List.of(leg)
        );

        var json = objectMapper.readTree(summary.getSummaryJson());
        assertThat(summary.getStatus()).isEqualTo("completed");
        assertThat(summary.getGenerationMode()).isEqualTo("rule_based");
        assertThat(json.get("trip_checklist")).isNotNull();
        assertThat(json.get("alert_cards").get(0).get("category").asText()).isEqualTo("practical");
        assertThat(json.get("days").get(0).get("day").asInt()).isEqualTo(1);
        assertThat(json.get("days").get(0).get("title").asText()).isEqualTo("Day 1 - 숙소와 이동 정리");
        assertThat(json.get("days").get(0).get("summary").asText())
                .isEqualTo("오사카 중심의 여유로운 일정입니다. 체류 시간은 약 1시간, 이동 시간은 약 15분입니다.");
        assertThat(json.get("days").get(0).get("primary_region").asText()).isEqualTo("오사카");
        assertThat(json.get("days").get(0).get("pace").asText()).isEqualTo("relaxed");
        assertThat(json.get("days").get(0).get("card_count").asInt()).isEqualTo(1);
        assertThat(json.get("days").get(0).get("total_move_minutes").asInt()).isEqualTo(15);
        assertThat(json.get("days").get(0).get("cards").get(0).get("name").asText()).isEqualTo("난바 호텔");
        assertThat(json.get("days").get(0).get("cards").get(0).get("scheduled_time").asText()).isEqualTo("09:00");
        assertThat(json.get("days").get(0).get("cards").get(0).get("user_context").asText())
                .isEqualTo("체크인 이후 난바 근처를 잡았어요.");
        assertThat(json.get("days").get(0).get("cards").get(0).get("tips").asText())
                .isEqualTo("숙소 바우처를 모바일에 저장해두면 좋아요.");
        assertThat(json.get("days").get(0).get("checklist").get(0).get("source").asText())
                .isEqualTo("route_warning");
        assertThat(json.get("days").get(0).get("checklist").toString())
                .contains("난바 호텔 체크인 시간과 예약 바우처를 확인하세요.");
        assertThat(json.get("days").get(1).get("title").asText()).isEqualTo("Day 2 - 비워둔 완충 Day");
        assertThat(json.get("days").get(1).get("pace").asText()).isEqualTo("buffer");
        verify(confirmSummaryRepository).save(any(ConfirmSummary.class));
    }

    private PlaceCard placeCard(UUID tripId, String name, String category, int day, int order) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, name, category, "오사카", (short) 60, null, null, "15:00", null, null
        );
        setField(card, "instanceId", UUID.randomUUID());
        setField(card, "day", day);
        setField(card, "dayOrder", (short) order);
        return card;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field field = PlaceCard.class.getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
