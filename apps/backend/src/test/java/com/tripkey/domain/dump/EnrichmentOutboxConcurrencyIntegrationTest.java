package com.tripkey.domain.dump;

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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class EnrichmentOutboxConcurrencyIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"))
            .withInitScript("postgis-test-schema.sql");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
        r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        r.add("spring.datasource.hikari.maximum-pool-size", () -> "5");
    }

    @Autowired EnrichmentOutboxRepository outboxRepository;
    @Autowired PlatformTransactionManager txManager;

    @Test
    void twoConcurrentPublishersNeverClaimSameRowWithSkipLocked() throws Exception {
        seedPending(4);

        CyclicBarrier barrier = new CyclicBarrier(2);
        CompletableFuture<List<Long>> a = CompletableFuture.supplyAsync(() -> claimInNewTx(barrier, 2));
        CompletableFuture<List<Long>> b = CompletableFuture.supplyAsync(() -> claimInNewTx(barrier, 2));

        List<Long> claimedA = a.get(30, TimeUnit.SECONDS);
        List<Long> claimedB = b.get(30, TimeUnit.SECONDS);

        Set<Long> union = claimedA.stream().collect(Collectors.toSet());
        union.addAll(claimedB);
        assertThat(claimedA).doesNotContainAnyElementsOf(claimedB);
        assertThat(union).hasSize(4);
    }

    private List<Long> claimInNewTx(CyclicBarrier barrier, int batchSize) {
        TransactionTemplate tt = new TransactionTemplate(txManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return tt.execute(status -> {
            List<EnrichmentOutbox> claimed = outboxRepository.findPublishable(batchSize);
            OffsetDateTime now = OffsetDateTime.now();
            claimed.forEach(row -> row.markPublished(now));
            outboxRepository.saveAll(claimed);
            outboxRepository.flush();
            try {
                barrier.await(10, TimeUnit.SECONDS);
            } catch (Exception e) {
                throw new IllegalStateException(e);
            }
            return claimed.stream().map(EnrichmentOutbox::getId).collect(Collectors.toList());
        });
    }

    private void seedPending(int count) {
        TransactionTemplate tt = new TransactionTemplate(txManager);
        tt.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tt.executeWithoutResult(status -> {
            UUID trip = UUID.randomUUID();
            for (int i = 0; i < count; i++) {
                outboxRepository.saveAndFlush(
                        EnrichmentOutbox.create(trip, UUID.randomUUID(), "{\"i\":" + i + "}"));
            }
        });
    }
}
