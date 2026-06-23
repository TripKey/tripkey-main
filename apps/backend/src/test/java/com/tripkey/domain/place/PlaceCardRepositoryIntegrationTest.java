package com.tripkey.domain.place;

import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class PlaceCardRepositoryIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4")
                    .asCompatibleSubstituteFor("postgres"))
            .withInitScript("postgis-test-schema.sql");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    private PlaceCardRepository placeCardRepository;

    @Autowired
    private TripRepository tripRepository;

    @Test
    void clusterAvailableCardsGroupsCardsWithin1500MetersInWebMercator() {
        Trip trip = new Trip((short) 3, (short) 1);
        tripRepository.saveAndFlush(trip);
        UUID tripId = trip.getTripId();

        // Tokyo Station 기준. Web Mercator(EPSG:3857) 기준 1500m 임계값에서
        // 같은 클러스터로 묶여야 하는 두 점(near*)과 명확히 떨어진 한 점(far)을 배치.
        // 0.005도 위도차 ≈ 555m → mercator 보정(sec 35.7° ≈ 1.23) ≈ 683m → 1500m 안 (같은 클러스터)
        // 0.05도 위도차 ≈ 5550m → mercator ≈ 6830m → 1500m 밖 (다른 클러스터)
        UUID nearAId = saveReadyCard(tripId, "Tokyo Station", 139.7670, 35.6812);
        UUID nearBId = saveReadyCard(tripId, "Otemachi",      139.7670, 35.6862);
        UUID farId   = saveReadyCard(tripId, "Shibuya-ish",   139.7670, 35.7312);

        List<Object[]> rows = placeCardRepository.clusterAvailableCards(tripId, 1500.0, 1);

        Map<UUID, Integer> clusterIdByInstance = rows.stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[1]).intValue()));

        assertThat(clusterIdByInstance)
                .as("세 카드 모두 minPts=1 이므로 어떤 클러스터든 ID를 부여받아야 함")
                .containsKeys(nearAId, nearBId, farId);
        assertThat(clusterIdByInstance.get(nearAId))
                .as("1.5km 안의 두 카드는 같은 cluster_id 를 가져야 함")
                .isEqualTo(clusterIdByInstance.get(nearBId));
        assertThat(clusterIdByInstance.get(farId))
                .as("1.5km 밖 카드는 다른 cluster_id 를 가져야 함")
                .isNotEqualTo(clusterIdByInstance.get(nearAId));
    }

    @Test
    void storesFlightDatetimeAndRole() {
        Trip trip = new Trip((short) 3, (short) 1);
        tripRepository.saveAndFlush(trip);

        PlaceCard card = PlaceCard.createFromAiResponse(
                trip.getTripId(),
                new AiPlaceCardDto(
                        null,
                        "ICN-NRT",
                        "transport",
                        "confirmed",
                        "ready",
                        false,
                        true,
                        null,
                        null,
                        null,
                        null,
                        "09:00 출발",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        "KE703",
                        "2026-07-01T09:00:00+09:00",
                        "outbound"
                ),
                "ai_parse"
        );

        PlaceCard saved = placeCardRepository.saveAndFlush(card);
        placeCardRepository.flush();

        PlaceCard reloaded = placeCardRepository.findById(saved.getInstanceId()).orElseThrow();

        assertThat(reloaded.getFlightNumber()).isEqualTo("KE703");
        assertThat(reloaded.getFlightDatetime()).isEqualTo("2026-07-01T09:00:00+09:00");
        assertThat(reloaded.getFlightRole()).isEqualTo("outbound");
    }

    @Test
    void findAdjacentCardDistancesReturnsConsecutiveDayPairsWithDistance() {
        Trip trip = new Trip((short) 3, (short) 1);
        tripRepository.saveAndFlush(trip);
        UUID tripId = trip.getTripId();

        // Day 1: 도톈보리→우메다 → 거리는 약 5km. day_order=1,2,3 으로 두 페어 발생.
        UUID a = savePlacedCard(tripId, "Card A", 135.5023, 34.6687, 1, (short) 1);
        UUID b = savePlacedCard(tripId, "Card B", 135.4960, 34.7025, 1, (short) 2);
        savePlacedCard(tripId, "Card C", 135.5500, 34.7000, 1, (short) 3);
        // Day 2: 1개만 — 페어 없음
        savePlacedCard(tripId, "Card D", 135.0000, 34.0000, 2, (short) 1);
        // Excluded — 페어 계산 제외
        UUID excluded = savePlacedCard(tripId, "Excluded", 135.5025, 34.6688, 1, (short) 4);
        markExcluded(excluded);
        // 미배치 카드 — day=null 이라 페어 없음
        savePlacedCard(tripId, "Unplaced", 135.5026, 34.6689, null, null);
        // geom null — 페어 계산 제외
        saveNoGeomCard(tripId, "No Geom", 1, (short) 5);

        List<Object[]> rows = placeCardRepository.findAdjacentCardDistances(tripId);

        // Day 1 페어 2건만 반환 (A-B, B-C). Day 2 단일, excluded, unplaced, no-geom 제외.
        assertThat(rows).hasSize(2);
        Map<UUID, Double> distanceByFirstId = rows.stream()
                .collect(Collectors.toMap(
                        row -> (UUID) row[0],
                        row -> ((Number) row[3]).doubleValue()));
        assertThat(distanceByFirstId)
                .as("Day 1 의 인접 페어 두 건만 조회되어야 함")
                .containsKeys(a, b);
        assertThat(distanceByFirstId.get(a))
                .as("도톈보리→우메다 거리 약 5km 이상")
                .isGreaterThan(3000.0);
    }

    private UUID savePlacedCard(UUID tripId, String name, double lng, double lat, Integer day, Short dayOrder) {
        PlaceCard card = new PlaceCard();
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        setField(card, "instanceId", id);
        setField(card, "tripId", tripId);
        setField(card, "name", name);
        setField(card, "category", "place");
        setField(card, "classification", "confirmed");
        setField(card, "placementStatus", "ready");
        setField(card, "processingStatus", "completed");
        setField(card, "actionType", "review_only");
        setField(card, "canExclude", true);
        setField(card, "allowDuplicate", false);
        setField(card, "isExcluded", false);
        setField(card, "isAiGenerated", false);
        setField(card, "pendingReorder", false);
        setField(card, "lat", lat);
        setField(card, "lng", lng);
        if (day != null) {
            setField(card, "day", day);
            setField(card, "dayOrder", dayOrder);
        }
        setField(card, "createdAt", now);
        setField(card, "updatedAt", now);
        placeCardRepository.saveAndFlush(card);
        return id;
    }

    private void saveNoGeomCard(UUID tripId, String name, Integer day, Short dayOrder) {
        PlaceCard card = new PlaceCard();
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        setField(card, "instanceId", id);
        setField(card, "tripId", tripId);
        setField(card, "name", name);
        setField(card, "category", "place");
        setField(card, "classification", "confirmed");
        setField(card, "placementStatus", "ready");
        setField(card, "processingStatus", "completed");
        setField(card, "actionType", "review_only");
        setField(card, "canExclude", true);
        setField(card, "allowDuplicate", false);
        setField(card, "isExcluded", false);
        setField(card, "isAiGenerated", false);
        setField(card, "pendingReorder", false);
        // lat/lng null → geom null
        setField(card, "day", day);
        setField(card, "dayOrder", dayOrder);
        setField(card, "createdAt", now);
        setField(card, "updatedAt", now);
        placeCardRepository.saveAndFlush(card);
    }

    private void markExcluded(UUID instanceId) {
        PlaceCard card = placeCardRepository.findById(instanceId).orElseThrow();
        setField(card, "isExcluded", true);
        placeCardRepository.saveAndFlush(card);
    }

    private UUID saveReadyCard(UUID tripId, String name, double lng, double lat) {
        PlaceCard card = new PlaceCard();
        UUID id = UUID.randomUUID();
        OffsetDateTime now = OffsetDateTime.now();
        setField(card, "instanceId", id);
        setField(card, "tripId", tripId);
        setField(card, "name", name);
        setField(card, "category", "place");
        setField(card, "classification", "confirmed");
        setField(card, "placementStatus", "ready");
        setField(card, "processingStatus", "completed");
        setField(card, "actionType", "review_only");
        setField(card, "canExclude", true);
        setField(card, "allowDuplicate", false);
        setField(card, "isExcluded", false);
        setField(card, "isAiGenerated", false);
        setField(card, "pendingReorder", false);
        setField(card, "lat", lat);
        setField(card, "lng", lng);
        setField(card, "createdAt", now);
        setField(card, "updatedAt", now);
        placeCardRepository.saveAndFlush(card);
        return id;
    }

    private static void setField(Object target, String name, Object value) {
        try {
            Field field = PlaceCard.class.getDeclaredField(name);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException(e);
        }
    }
}
