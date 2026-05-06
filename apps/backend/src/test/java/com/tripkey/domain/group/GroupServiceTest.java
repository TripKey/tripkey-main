package com.tripkey.domain.group;

import com.tripkey.common.exception.TripNotFoundException;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.group.Groups03Response;
import com.tripkey.dto.group.Groups04Response;
import com.tripkey.dto.group.StockGroup;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    private static final GeometryFactory GEOMETRY_FACTORY =
            new GeometryFactory(new PrecisionModel(), 4326);

    @Mock
    private TripRepository tripRepository;

    @Mock
    private PlaceCardRepository placeCardRepository;

    @InjectMocks
    private GroupService groupService;

    @Test
    void getGroups03ThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        assertThatThrownBy(() -> groupService.getGroups03(tripId))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void getGroups03ReturnsAllEmptyGroupsWhenNoCards() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        Groups03Response response = groupService.getGroups03(tripId);

        assertThat(response.view()).isEqualTo("03");
        assertThat(response.inputRequired()).isEmpty();
        assertThat(response.selectRequired()).isEmpty();
        assertThat(response.fixRequired()).isEmpty();
        assertThat(response.reviewOnly()).isEmpty();
        assertThat(response.excluded()).isEmpty();
    }

    @Test
    void getGroups03DistributesCardsByActionType() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard inputCard = cardWith(tripId, "input_required", false, at(10, 0));
        PlaceCard selectCard = cardWith(tripId, "select_required", false, at(10, 1));
        PlaceCard fixCard = cardWith(tripId, "fix_required", false, at(10, 2));
        PlaceCard reviewCard = cardWith(tripId, "review_only", false, at(10, 3));

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(reviewCard, fixCard, selectCard, inputCard));

        Groups03Response response = groupService.getGroups03(tripId);

        assertThat(response.inputRequired()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(inputCard.getInstanceId());
        assertThat(response.selectRequired()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(selectCard.getInstanceId());
        assertThat(response.fixRequired()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(fixCard.getInstanceId());
        assertThat(response.reviewOnly()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(reviewCard.getInstanceId());
        assertThat(response.excluded()).isEmpty();
    }

    @Test
    void getGroups03PutsExcludedCardOnlyInExcludedGroup() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard excludedFix = cardWith(tripId, "fix_required", true, at(10, 0));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(excludedFix));

        Groups03Response response = groupService.getGroups03(tripId);

        assertThat(response.fixRequired()).isEmpty();
        assertThat(response.excluded()).hasSize(1)
                .extracting(c -> c.instanceId()).containsExactly(excludedFix.getInstanceId());
    }

    @Test
    void getGroups03SortsCardsByCreatedAtAscWithinGroups() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard older = cardWith(tripId, "review_only", false, at(9, 0));
        PlaceCard newer = cardWith(tripId, "review_only", false, at(10, 0));
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(newer, older));

        Groups03Response response = groupService.getGroups03(tripId);

        assertThat(response.reviewOnly())
                .extracting(c -> c.instanceId())
                .containsExactly(older.getInstanceId(), newer.getInstanceId());
    }

    @Test
    void getGroups04ThrowsTripNotFoundWhenTripMissing() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(false);

        assertThatThrownBy(() -> groupService.getGroups04(tripId))
                .isInstanceOf(TripNotFoundException.class);
    }

    @Test
    void getGroups04ReturnsAllEmptyGroupsWhenNoCards() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of());

        Groups04Response response = groupService.getGroups04(tripId);

        assertThat(response.view()).isEqualTo("04");
        assertThat(response.available()).isEmpty();
        assertThat(response.pendingReorder()).isEmpty();
        assertThat(response.unavailable()).isEmpty();
    }

    @Test
    void getGroups04ClassifiesUnavailableByBlockedNeedsInputOrFailed() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard blocked = stockCard(tripId, "blocked", "completed", null, "신주쿠", at(10, 0));
        PlaceCard needsInput = stockCard(tripId, "needs_input", "completed", null, "신주쿠", at(10, 1));
        PlaceCard failed = stockCard(tripId, "ready", "failed", null, "신주쿠", at(10, 2));

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(blocked, needsInput, failed));

        Groups04Response response = groupService.getGroups04(tripId);

        assertThat(response.unavailable())
                .extracting(CardDto::instanceId)
                .containsExactlyInAnyOrder(
                        blocked.getInstanceId(),
                        needsInput.getInstanceId(),
                        failed.getInstanceId());
        assertThat(response.available()).isEmpty();
        assertThat(response.pendingReorder()).isEmpty();
    }

    @Test
    void getGroups04ClassifiesPendingReorderByProcessingOrMissingGeom() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard stillProcessing = stockCard(tripId, "ready_partial", "processing",
                point(139.7, 35.69), "신주쿠", at(10, 0));
        PlaceCard noGeom = stockCard(tripId, "ready_partial", "completed", null, "신주쿠", at(10, 1));

        when(placeCardRepository.findAllByTripId(tripId))
                .thenReturn(List.of(stillProcessing, noGeom));

        Groups04Response response = groupService.getGroups04(tripId);

        assertThat(response.pendingReorder())
                .extracting(CardDto::instanceId)
                .containsExactlyInAnyOrder(stillProcessing.getInstanceId(), noGeom.getInstanceId());
        assertThat(response.available()).isEmpty();
        assertThat(response.unavailable()).isEmpty();
    }

    @Test
    void getGroups04SkipsExcludedCards() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard excluded = stockCard(tripId, "blocked", "completed", null, "신주쿠", at(10, 0));
        setField(excluded, "isExcluded", true);

        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(excluded));

        Groups04Response response = groupService.getGroups04(tripId);

        assertThat(response.available()).isEmpty();
        assertThat(response.pendingReorder()).isEmpty();
        assertThat(response.unavailable()).isEmpty();
    }

    @Test
    void getGroups04ClustersAvailableCardsWithDominantLocationLabel() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard a = stockCard(tripId, "ready_partial", "completed",
                point(139.7016, 35.6586), "시부야", at(10, 0));
        PlaceCard b = stockCard(tripId, "ready_partial", "completed",
                point(139.7020, 35.6590), "시부야", at(10, 1));
        PlaceCard c = stockCard(tripId, "ready_partial", "completed",
                point(139.7016, 35.6586), null, at(10, 2));

        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(a, b, c));
        when(placeCardRepository.clusterAvailableCards(eq(tripId), anyDouble(), anyInt()))
                .thenReturn(List.of(
                        new Object[]{a.getInstanceId(), 0},
                        new Object[]{b.getInstanceId(), 0},
                        new Object[]{c.getInstanceId(), 0}
                ));

        Groups04Response response = groupService.getGroups04(tripId);

        assertThat(response.available()).hasSize(1);
        StockGroup group = response.available().get(0);
        assertThat(group.label()).isEqualTo("시부야");
        assertThat(group.cards()).hasSize(3)
                .extracting(CardDto::instanceId)
                .containsExactly(a.getInstanceId(), b.getInstanceId(), c.getInstanceId());
    }

    @Test
    void getGroups04AppliesSuffixWhenSameLabelAcrossMultipleClusters() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard a = stockCard(tripId, "ready_partial", "completed",
                point(139.7016, 35.6586), "신주쿠", at(10, 0));
        PlaceCard b = stockCard(tripId, "ready_partial", "completed",
                point(139.7020, 35.6590), "신주쿠", at(10, 1));
        PlaceCard c = stockCard(tripId, "ready_partial", "completed",
                point(139.7700, 35.6700), "신주쿠", at(10, 2));

        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(a, b, c));
        when(placeCardRepository.clusterAvailableCards(eq(tripId), anyDouble(), anyInt()))
                .thenReturn(List.of(
                        new Object[]{a.getInstanceId(), 0},
                        new Object[]{b.getInstanceId(), 0},
                        new Object[]{c.getInstanceId(), 1}
                ));

        Groups04Response response = groupService.getGroups04(tripId);

        assertThat(response.available()).hasSize(2);
        assertThat(response.available())
                .extracting(StockGroup::label)
                .containsExactly("신주쿠 1", "신주쿠 2");
        assertThat(response.available().get(0).cards()).hasSize(2);
        assertThat(response.available().get(1).cards()).hasSize(1);
    }

    @Test
    void getGroups04LabelsClusterAsFallbackWhenNoLocation() {
        UUID tripId = UUID.randomUUID();
        when(tripRepository.existsById(tripId)).thenReturn(true);

        PlaceCard a = stockCard(tripId, "ready_partial", "completed",
                point(139.7016, 35.6586), null, at(10, 0));

        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(a));
        when(placeCardRepository.clusterAvailableCards(eq(tripId), anyDouble(), anyInt()))
                .thenReturn(List.<Object[]>of(new Object[]{a.getInstanceId(), 0}));

        Groups04Response response = groupService.getGroups04(tripId);

        assertThat(response.available()).hasSize(1);
        assertThat(response.available().get(0).label()).isEqualTo("기타");
    }

    private PlaceCard cardWith(UUID tripId, String actionType, boolean excluded, OffsetDateTime createdAt) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 카드", "place", null, null, null, null, null, null, null
        );
        setField(card, "instanceId", UUID.randomUUID());
        setField(card, "actionType", actionType);
        setField(card, "isExcluded", excluded);
        setField(card, "createdAt", createdAt);
        return card;
    }

    private PlaceCard stockCard(
            UUID tripId,
            String placementStatus,
            String processingStatus,
            Point geom,
            String location,
            OffsetDateTime createdAt
    ) {
        PlaceCard card = PlaceCard.createUserCard(
                tripId, "테스트 카드", "place", location, null, null, null, null, null, null
        );
        setField(card, "instanceId", UUID.randomUUID());
        setField(card, "placementStatus", placementStatus);
        setField(card, "processingStatus", processingStatus);
        setField(card, "geom", geom);
        setField(card, "createdAt", createdAt);
        return card;
    }

    private static Point point(double lng, double lat) {
        return GEOMETRY_FACTORY.createPoint(new Coordinate(lng, lat));
    }

    private static OffsetDateTime at(int hour, int minute) {
        return OffsetDateTime.of(2026, 4, 30, hour, minute, 0, 0, ZoneOffset.UTC);
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
