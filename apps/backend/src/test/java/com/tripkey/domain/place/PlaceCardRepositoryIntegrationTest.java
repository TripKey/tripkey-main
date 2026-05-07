package com.tripkey.domain.place;

import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
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
