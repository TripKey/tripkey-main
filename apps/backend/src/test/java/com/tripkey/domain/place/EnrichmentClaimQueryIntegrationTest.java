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
import java.util.UUID;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class EnrichmentClaimQueryIntegrationTest {

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

    @Autowired
    private jakarta.persistence.EntityManager entityManager;

    @Test
    void claimsPendingAndStaleProcessingButNotCompletedFailedOrFresh() {
        UUID tripId = newTrip();
        UUID pending = saveCard(tripId, "pending", "pending", null, hoursAgo(0));
        UUID stale = saveCard(tripId, "stale", "processing", minutesAgo(5), hoursAgo(0));
        saveCard(tripId, "fresh", "processing", OffsetDateTime.now(), hoursAgo(0));
        saveCard(tripId, "completed", "completed", null, hoursAgo(0));
        saveCard(tripId, "failed", "failed", null, hoursAgo(0));

        // claimTimeoutSeconds=60 -> 5분 전 claim 은 stale
        List<UUID> claimed = placeCardRepository.findClaimablePendingCards(60, 50).stream()
                .map(PlaceCard::getInstanceId)
                .collect(Collectors.toList());

        assertThat(claimed).containsExactlyInAnyOrder(pending, stale);
    }

    @Test
    void respectsBatchSizeAndCreatedAtFifoOrder() {
        UUID tripId = newTrip();
        UUID oldest = saveCard(tripId, "c1", "pending", null, hoursAgo(3));
        UUID middle = saveCard(tripId, "c2", "pending", null, hoursAgo(2));
        saveCard(tripId, "c3", "pending", null, hoursAgo(1));

        List<UUID> claimed = placeCardRepository.findClaimablePendingCards(60, 2).stream()
                .map(PlaceCard::getInstanceId)
                .collect(Collectors.toList());

        assertThat(claimed).containsExactly(oldest, middle);
    }

    private UUID newTrip() {
        Trip trip = new Trip((short) 3, (short) 1);
        tripRepository.saveAndFlush(trip);
        return trip.getTripId();
    }

    private static OffsetDateTime minutesAgo(int m) {
        return OffsetDateTime.now().minusMinutes(m);
    }

    private static OffsetDateTime hoursAgo(int h) {
        return OffsetDateTime.now().minusHours(h);
    }

    private UUID saveCard(UUID tripId, String name, String processingStatus,
                          OffsetDateTime claimedAt, OffsetDateTime createdAt) {
        PlaceCard card = new PlaceCard();
        UUID id = UUID.randomUUID();
        setField(card, "instanceId", id);
        setField(card, "tripId", tripId);
        setField(card, "name", name);
        setField(card, "category", "place");
        setField(card, "classification", "confirmed");
        setField(card, "placementStatus", "ready_partial");
        setField(card, "processingStatus", processingStatus);
        setField(card, "actionType", "review_only");
        setField(card, "canExclude", true);
        setField(card, "allowDuplicate", false);
        setField(card, "isExcluded", false);
        setField(card, "isAiGenerated", false);
        setField(card, "pendingReorder", false);
        setField(card, "enrichmentAttempts", 0);
        setField(card, "enrichmentClaimedAt", claimedAt);
        setField(card, "createdAt", createdAt);
        setField(card, "updatedAt", createdAt);
        placeCardRepository.saveAndFlush(card);
        // @PrePersist onCreate() 가 createdAt 를 now() 로 덮어쓰므로 네이티브 update 로 보정
        entityManager.createNativeQuery(
                        "update place_cards set created_at = :ts where instance_id = :id")
                .setParameter("ts", createdAt)
                .setParameter("id", id)
                .executeUpdate();
        entityManager.flush();
        entityManager.clear();
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
