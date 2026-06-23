package com.tripkey.domain.dump;

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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase.Replace.NONE;

@DataJpaTest
@AutoConfigureTestDatabase(replace = NONE)
@Testcontainers
class DumpJobFlightInputIntegrationTest {

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

    @Autowired DumpJobRepository dumpJobRepository;
    @Autowired TripRepository tripRepository;

    @Test
    void dumpJobPersistsFlightJsonbRoundTrip() {
        Trip trip = new Trip((short) 3, (short) 1);
        tripRepository.saveAndFlush(trip);
        String depJson = "{\"departure_airport\":\"ICN\",\"arrival_airport\":\"NRT\",\"flight_number\":\"KE703\",\"datetime\":\"2026-07-01T09:00:00+09:00\"}";

        DumpJob job = DumpJob.create(trip.getTripId(), "오사카 3박4일 여행입니다.", depJson, null);
        dumpJobRepository.saveAndFlush(job);

        DumpJob reloaded = dumpJobRepository.findById(job.getJobId()).orElseThrow();
        assertThat(reloaded.getDepartureFlight()).contains("ICN").contains("KE703");
        assertThat(reloaded.getReturnFlight()).isNull();
    }

    @Test
    void dumpJobPersistsAccommodationJsonbRoundTrip() {
        Trip trip = new Trip((short) 3, (short) 1);
        tripRepository.saveAndFlush(trip);
        String accJson = "[{\"name\":\"호텔 그란비아 오사카\",\"location\":\"오사카\",\"check_in\":\"2026-07-01\",\"check_out\":\"2026-07-03\"}]";

        DumpJob job = DumpJob.create(trip.getTripId(), "오사카 3박4일 여행입니다.", null, null, accJson);
        dumpJobRepository.saveAndFlush(job);

        DumpJob reloaded = dumpJobRepository.findById(job.getJobId()).orElseThrow();
        assertThat(reloaded.getAccommodationInputs()).contains("호텔 그란비아 오사카").contains("check_in");
        assertThat(reloaded.getDepartureFlight()).isNull();
        assertThat(reloaded.getReturnFlight()).isNull();
    }
}
