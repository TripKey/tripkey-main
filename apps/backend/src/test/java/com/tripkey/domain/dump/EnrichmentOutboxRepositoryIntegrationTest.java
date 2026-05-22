package com.tripkey.domain.dump;

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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class EnrichmentOutboxRepositoryIntegrationTest {

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
    }

    @Autowired EnrichmentOutboxRepository repository;

    @Test
    void findPublishableReturnsOnlyDuePendingFifoLimited() {
        UUID trip = UUID.randomUUID();
        var old = repository.saveAndFlush(EnrichmentOutbox.create(trip, UUID.randomUUID(), "{\"a\":1}"));
        var mid = repository.saveAndFlush(EnrichmentOutbox.create(trip, UUID.randomUUID(), "{\"a\":2}"));
        var done = EnrichmentOutbox.create(trip, UUID.randomUUID(), "{\"a\":3}");
        done.markPublished(OffsetDateTime.now());
        repository.saveAndFlush(done);
        var future = EnrichmentOutbox.create(trip, UUID.randomUUID(), "{\"a\":4}");
        future.backoff(OffsetDateTime.now().plusHours(1), 5);
        repository.saveAndFlush(future);

        List<Long> publishableIds = repository.findPublishable(10).stream()
                .map(EnrichmentOutbox::getId).toList();

        assertThat(publishableIds).containsExactly(old.getId(), mid.getId());
    }

    @Test
    void markPublishedAndRecordPublishFailureTransitions() {
        UUID trip = UUID.randomUUID();
        var ok = repository.saveAndFlush(EnrichmentOutbox.create(trip, UUID.randomUUID(), "{}"));
        ok.markPublished(OffsetDateTime.now());
        repository.saveAndFlush(ok);
        assertThat(repository.findById(ok.getId()).orElseThrow().getStatus()).isEqualTo("published");

        var fail = repository.saveAndFlush(EnrichmentOutbox.create(trip, UUID.randomUUID(), "{}"));
        fail.recordPublishFailure(OffsetDateTime.now().plusMinutes(1), 2); // attempts 1 < 2 -> pending
        repository.saveAndFlush(fail);
        var reloaded1 = repository.findById(fail.getId()).orElseThrow();
        assertThat(reloaded1.getStatus()).isEqualTo("pending");
        assertThat(reloaded1.getAttempts()).isEqualTo(1);

        reloaded1.recordPublishFailure(OffsetDateTime.now().plusMinutes(1), 2); // attempts 2 >= 2 -> failed
        repository.saveAndFlush(reloaded1);
        var reloaded2 = repository.findById(fail.getId()).orElseThrow();
        assertThat(reloaded2.getStatus()).isEqualTo("failed");
        assertThat(reloaded2.getAttempts()).isEqualTo(2);
    }
}
