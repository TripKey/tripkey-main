package com.tripkey.domain.route;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.dto.placement.RouteLeg;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiRouteRequest;
import com.tripkey.infra.aiengine.dto.AiRouteResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RouteServiceTest {

    @Mock PlaceCardRepository placeCardRepository;
    @Mock RouteLegCacheRepository routeLegCacheRepository;
    @Mock AiEngineClient aiEngineClient;

    @InjectMocks RouteService routeService;

    private PlaceCard card(UUID id, int day, int order, Double lat, Double lng) {
        PlaceCard c = newPlaceCard();
        setField(c, "instanceId", id);
        setField(c, "day", day);
        setField(c, "dayOrder", (short) order);
        setField(c, "lat", lat);
        setField(c, "lng", lng);
        setField(c, "category", "place");
        setField(c, "isExcluded", false);
        return c;
    }

    private static PlaceCard newPlaceCard() {
        try {
            Constructor<PlaceCard> ctor = PlaceCard.class.getDeclaredConstructor();
            ctor.setAccessible(true);
            return ctor.newInstance();
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field f = PlaceCard.class.getDeclaredField(name);
            f.setAccessible(true);
            f.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    void computesLegFromAiWhenCacheMisses() {
        UUID tripId = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(
                card(a, 1, 1, 34.70, 135.50),
                card(b, 1, 2, 34.67, 135.49)
        ));
        when(routeLegCacheRepository.findByOriginLatAndOriginLngAndDestLatAndDestLng(
                anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(Optional.empty());
        when(aiEngineClient.route(any(AiRouteRequest.class))).thenReturn(new AiRouteResponse(List.of(
                new AiRouteResponse.Leg(a.toString(), b.toString(), 1320, 5400, "transit", "google")
        )));

        List<RouteLeg> legs = routeService.computeLegs(tripId);

        assertThat(legs).hasSize(1);
        assertThat(legs.get(0).mode()).isEqualTo("transit");
        assertThat(legs.get(0).durationSeconds()).isEqualTo(1320);
        assertThat(legs.get(0).day()).isEqualTo(1);
        verify(routeLegCacheRepository).save(any(RouteLegCache.class));
    }

    @Test
    void usesCacheWithoutCallingAi() {
        UUID tripId = UUID.randomUUID();
        UUID a = UUID.randomUUID();
        UUID b = UUID.randomUUID();
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(
                card(a, 1, 1, 34.70, 135.50),
                card(b, 1, 2, 34.67, 135.49)
        ));
        when(routeLegCacheRepository.findByOriginLatAndOriginLngAndDestLatAndDestLng(
                anyDouble(), anyDouble(), anyDouble(), anyDouble())).thenReturn(Optional.of(
                RouteLegCache.of(34.70, 135.50, 34.67, 135.49, 900, 3000, "walking", "google")));

        List<RouteLeg> legs = routeService.computeLegs(tripId);

        assertThat(legs).hasSize(1);
        assertThat(legs.get(0).mode()).isEqualTo("walking");
        verify(aiEngineClient, never()).route(any());
    }

    @Test
    void skipsCardsWithoutCoordinates() {
        UUID tripId = UUID.randomUUID();
        when(placeCardRepository.findAllByTripId(tripId)).thenReturn(List.of(
                card(UUID.randomUUID(), 1, 1, null, null),
                card(UUID.randomUUID(), 1, 2, 34.67, 135.49)
        ));

        List<RouteLeg> legs = routeService.computeLegs(tripId);

        assertThat(legs).isEmpty();
        verify(aiEngineClient, never()).route(any());
    }
}
