package com.tripkey.domain.place;

import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.lang.reflect.Field;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class EnrichmentClaimConcurrencyIntegrationTest {

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
    private PlatformTransactionManager txManager;

    @Test
    void twoConcurrentClaimsNeverDoubleClaimWithSkipLocked() throws Exception {
        // 외부(테스트) 트랜잭션과 분리된 REQUIRES_NEW 트랜잭션으로 4개 pending 카드를 커밋.
        UUID tripId = newCommittedTrip();
        seedPendingCards(tripId, 4);

        CyclicBarrier barrier = new CyclicBarrier(2);
        CompletableFuture<List<UUID>> a = CompletableFuture.supplyAsync(() -> claimInNewTx(barrier, 2));
        CompletableFuture<List<UUID>> b = CompletableFuture.supplyAsync(() -> claimInNewTx(barrier, 2));

        List<UUID> claimedA = a.get();
        List<UUID> claimedB = b.get();

        Set<UUID> union = claimedA.stream().collect(Collectors.toSet());
        union.addAll(claimedB);
        assertThat(claimedA).doesNotContainAnyElementsOf(claimedB);
        assertThat(union).hasSize(4);
    }

    private List<UUID> claimInNewTx(CyclicBarrier barrier, int batchSize) {
        TransactionTemplate tt = new TransactionTemplate(txManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tt.execute(status -> {
            List<PlaceCard> claimed = placeCardRepository.findClaimablePendingCards(60, batchSize);
            OffsetDateTime now = OffsetDateTime.now();
            claimed.forEach(c -> c.claimForEnrichment(now));
            placeCardRepository.saveAll(claimed);
            placeCardRepository.flush();
            try {
                // 두 트랜잭션이 동시에 FOR UPDATE 락을 잡은 상태에서 커밋하도록 정렬
                barrier.await();
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
            return claimed.stream().map(PlaceCard::getInstanceId).collect(Collectors.toList());
        });
    }

    private UUID newCommittedTrip() {
        TransactionTemplate tt = new TransactionTemplate(txManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tt.execute(status -> {
            Trip trip = new Trip((short) 3, (short) 1);
            tripRepository.saveAndFlush(trip);
            return trip.getTripId();
        });
    }

    private void seedPendingCards(UUID tripId, int count) {
        TransactionTemplate tt = new TransactionTemplate(txManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tt.executeWithoutResult(status -> {
            for (int i = 0; i < count; i++) {
                PlaceCard card = new PlaceCard();
                setField(card, "instanceId", UUID.randomUUID());
                setField(card, "tripId", tripId);
                setField(card, "name", "c" + i);
                setField(card, "category", "place");
                setField(card, "classification", "confirmed");
                setField(card, "placementStatus", "ready_partial");
                setField(card, "processingStatus", "pending");
                setField(card, "actionType", "review_only");
                setField(card, "canExclude", true);
                setField(card, "allowDuplicate", false);
                setField(card, "isExcluded", false);
                setField(card, "isAiGenerated", false);
                setField(card, "pendingReorder", false);
                setField(card, "enrichmentAttempts", 0);
                setField(card, "createdAt", OffsetDateTime.now());
                setField(card, "updatedAt", OffsetDateTime.now());
                placeCardRepository.saveAndFlush(card);
            }
        });
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
