package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.AiEngineClient;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.localstack.LocalStackContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.io.IOException;
import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.testcontainers.containers.localstack.LocalStackContainer.Service.SQS;

@SpringBootTest(properties = {
        "app.enrichment.relay.poll-interval-ms=500",
        // SQS listener constraint: messagesPerPoll (batch-size default 10) must be <= maxConcurrentMessages
        "spring.cloud.aws.sqs.listener.max-concurrent-messages=10",
        "spring.datasource.url=will-be-overridden",
        "spring.datasource.username=will-be-overridden",
        "spring.datasource.password=will-be-overridden"
})
@Testcontainers
class EnrichmentMqEndToEndTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"))
            .withInitScript("postgis-test-schema.sql");

    @Container
    static final LocalStackContainer LOCALSTACK = new LocalStackContainer(
            DockerImageName.parse("localstack/localstack:3.8")).withServices(SQS);

    /**
     * Queues must exist before the Spring context loads so that @SqsListener
     * can resolve the queue URL on startup. @DynamicPropertySource runs
     * after containers are started but before context load — we create the
     * queues here via execInContainer.
     */
    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) throws IOException, InterruptedException {
        LOCALSTACK.execInContainer("awslocal", "sqs", "create-queue", "--queue-name", "tripkey-enrichment");
        LOCALSTACK.execInContainer("awslocal", "sqs", "create-queue", "--queue-name", "tripkey-enrichment-dlq");
        r.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        r.add("spring.datasource.username", POSTGRES::getUsername);
        r.add("spring.datasource.password", POSTGRES::getPassword);
        r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        r.add("spring.cloud.aws.sqs.endpoint", () -> LOCALSTACK.getEndpointOverride(SQS).toString());
        r.add("spring.cloud.aws.region.static", LOCALSTACK::getRegion);
        r.add("spring.cloud.aws.credentials.access-key", LOCALSTACK::getAccessKey);
        r.add("spring.cloud.aws.credentials.secret-key", LOCALSTACK::getSecretKey);
        // Disable scheduling during context load; OutboxRelay is still available
        // but poll-interval is set via @SpringBootTest properties above (500 ms).
    }

    @MockitoBean
    AiEngineClient aiEngineClient;

    @Autowired PlaceCardRepository placeCardRepository;
    @Autowired AlertCardRepository alertCardRepository;
    @Autowired TripRepository tripRepository;
    @Autowired EnrichmentOutboxRepository outboxRepository;
    @Autowired com.fasterxml.jackson.databind.ObjectMapper objectMapper;

    @Test
    void outboxRelayedThroughSqsAndConsumedToCompletion() {
        Trip trip = new Trip((short) 3, (short) 1);
        tripRepository.saveAndFlush(trip);

        PlaceCard card = PlaceCard.createFromAiResponse(trip.getTripId(),
                new AiPlaceCardDto(null, "시부야", "place", "confirmed", "ready_partial",
                        false, false, (short) 90, null, "도쿄",
                        null, null, null, null, null, null, null, null, null, null, null),
                "ai_parse");
        PlaceCard saved = placeCardRepository.saveAndFlush(card);

        AiParseResponse.AlertCard alert = new AiParseResponse.AlertCard(
                "alert-e2e", "festival", "insight", "trip", null, "축제", null);
        when(aiEngineClient.enrichCardNonBlocking(any()))
                .thenReturn(new AiNonBlockingEnrichmentResponse(saved.getInstanceId(), List.of(), List.of(alert)));

        AiNonBlockingEnrichmentRequest req = AiNonBlockingEnrichmentRequest.from(
                saved, List.of("도쿄"), (short) 3, (short) 1);
        outboxRepository.saveAndFlush(EnrichmentOutbox.create(
                trip.getTripId(), saved.getInstanceId(), toJson(req)));

        await().atMost(Duration.ofSeconds(60)).untilAsserted(() -> {
            PlaceCard reloaded = placeCardRepository.findById(saved.getInstanceId()).orElseThrow();
            assertThat(reloaded.getProcessingStatus()).isEqualTo("completed");
            List<AlertCard> alerts = alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(trip.getTripId());
            assertThat(alerts).extracting(AlertCard::getAlertId).contains("alert-e2e");
        });
    }

    private String toJson(AiNonBlockingEnrichmentRequest req) {
        try {
            return objectMapper.writeValueAsString(req);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
