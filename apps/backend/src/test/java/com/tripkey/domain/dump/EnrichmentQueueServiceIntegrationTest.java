package com.tripkey.domain.dump;

import com.tripkey.domain.alert.AlertCard;
import com.tripkey.domain.alert.AlertCardRepository;
import com.tripkey.domain.place.PlaceCard;
import com.tripkey.domain.place.PlaceCardRepository;
import com.tripkey.domain.trip.Trip;
import com.tripkey.domain.trip.TripDestination;
import com.tripkey.domain.trip.TripDestinationRepository;
import com.tripkey.domain.trip.TripRepository;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.BeforeEach;
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

import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
@Transactional(propagation = Propagation.NOT_SUPPORTED)
class EnrichmentQueueServiceIntegrationTest {

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

    @Autowired private PlaceCardRepository placeCardRepository;
    @Autowired private AlertCardRepository alertCardRepository;
    @Autowired private TripRepository tripRepository;
    @Autowired private TripDestinationRepository tripDestinationRepository;
    @Autowired private PlatformTransactionManager txManager;

    private EnrichmentQueueService service;
    private TransactionTemplate newTx;

    @BeforeEach
    void setUp() {
        service = new EnrichmentQueueService(
                placeCardRepository, tripRepository, tripDestinationRepository, alertCardRepository);
        newTx = new TransactionTemplate(txManager);
        newTx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    @Test
    void claimBatchMarksProcessingAndBuildsRequestsWithTripContext() {
        UUID tripId = seedTripWithDestinations((short) 4, (short) 2, "오사카", "교토");
        UUID cardId = seedPendingCard(tripId, "도톤보리");

        List<AiNonBlockingEnrichmentRequest> requests = newTx.execute(s ->
                service.claimBatch(10, 60));

        assertThat(requests).filteredOn(r -> r.tripId().equals(tripId)).hasSize(1);
        AiNonBlockingEnrichmentRequest req = requests.stream()
                .filter(r -> r.tripId().equals(tripId))
                .findFirst()
                .orElseThrow();
        assertThat(req.tripId()).isEqualTo(tripId);
        assertThat(req.travelDays()).isEqualTo((short) 4);
        assertThat(req.companionCount()).isEqualTo((short) 2);
        assertThat(req.destinations()).containsExactly("오사카", "교토");
        assertThat(req.card().instanceId()).isEqualTo(cardId);

        PlaceCard reloaded = placeCardRepository.findById(cardId).orElseThrow();
        assertThat(reloaded.getProcessingStatus()).isEqualTo("processing");
        assertThat(reloaded.getEnrichmentClaimedAt()).isNotNull();
    }

    @Test
    void recordSuccessIsIdempotentAcrossDeliveries() {
        UUID tripId = seedTripWithDestinations((short) 3, (short) 1, "도쿄");
        UUID cardId = seedPendingCard(tripId, "시부야");
        AiParseResponse.AlertCard alert = new AiParseResponse.AlertCard(
                "alert-1", "festival", "insight", "trip", null, "축제 기간", null);
        AiNonBlockingEnrichmentResponse response =
                new AiNonBlockingEnrichmentResponse(cardId, List.of(), List.of(alert));

        newTx.executeWithoutResult(s -> service.recordSuccess(tripId, cardId, response));
        newTx.executeWithoutResult(s -> service.recordSuccess(tripId, cardId, response));

        List<AlertCard> alerts = alertCardRepository.findAllByTripIdOrderByCreatedAtAsc(tripId);
        assertThat(alerts).hasSize(1);
        assertThat(alerts.get(0).getAlertId()).isEqualTo("alert-1");
        assertThat(alerts.get(0).getJobId()).isNull();

        PlaceCard reloaded = placeCardRepository.findById(cardId).orElseThrow();
        assertThat(reloaded.getProcessingStatus()).isEqualTo("completed");
        assertThat(reloaded.getEnrichmentClaimedAt()).isNull();
    }

    @Test
    void recordFailureRetriesThenMarksFailedAtMaxAttempts() {
        UUID tripId = seedTripWithDestinations((short) 3, (short) 1, "도쿄");
        UUID cardId = seedPendingCard(tripId, "신주쿠");

        newTx.executeWithoutResult(s -> service.recordFailure(cardId, 2));
        PlaceCard afterFirst = placeCardRepository.findById(cardId).orElseThrow();
        assertThat(afterFirst.getProcessingStatus()).isEqualTo("pending");
        assertThat(afterFirst.getEnrichmentAttempts()).isEqualTo(1);

        newTx.executeWithoutResult(s -> service.recordFailure(cardId, 2));
        PlaceCard afterSecond = placeCardRepository.findById(cardId).orElseThrow();
        assertThat(afterSecond.getProcessingStatus()).isEqualTo("failed");
        assertThat(afterSecond.getEnrichmentAttempts()).isEqualTo(2);
    }

    private UUID seedTripWithDestinations(short travelDays, short companionCount, String... names) {
        return newTx.execute(s -> {
            Trip trip = new Trip(travelDays, companionCount);
            tripRepository.saveAndFlush(trip);
            short order = 0;
            for (String name : names) {
                tripDestinationRepository.saveAndFlush(new TripDestination(trip, name, order++));
            }
            return trip.getTripId();
        });
    }

    private UUID seedPendingCard(UUID tripId, String name) {
        return newTx.execute(s -> {
            PlaceCard card = PlaceCard.createFromAiResponse(
                    tripId,
                    new AiPlaceCardDto(
                            "p", name, "place", "confirmed", "ready_partial",
                            false, false, (short) 90, null, "오사카",
                            null, null, null, null, null, null, null, null, null, null, null),
                    "ai_parse");
            return placeCardRepository.saveAndFlush(card).getInstanceId();
        });
    }
}
