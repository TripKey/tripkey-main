package com.tripkey.domain.trip;

import com.tripkey.infra.aiengine.AiEngineClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TripServiceTest {

    @Mock
    private TripRepository tripRepository;

    @Mock
    private TripDestinationRepository tripDestinationRepository;

    @Mock
    private AiEngineClient aiEngineClient;

    @InjectMocks
    private TripService tripService;

    @Test
    void searchDestinationsReturnsAiEngineResults() {
        com.tripkey.infra.aiengine.dto.AiDestinationSearchResponse aiResults =
                new com.tripkey.infra.aiengine.dto.AiDestinationSearchResponse(
                        java.util.List.of(
                                new com.tripkey.infra.aiengine.dto.AiDestinationSearchResponse.Destination(
                                        "오사카", "일본", "ChIJ_osaka")
                        )
                );
        when(aiEngineClient.searchDestinations("오사")).thenReturn(aiResults);

        var response = tripService.searchDestinations("오사");

        org.assertj.core.api.Assertions.assertThat(response.results())
                .hasSize(1)
                .extracting(d -> d.name(), d -> d.country(), d -> d.placeId())
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple("오사카", "일본", "ChIJ_osaka"));
    }

    @Test
    void searchDestinationsFallsBackOnAiEngineFailure() {
        when(aiEngineClient.searchDestinations("오사"))
                .thenThrow(new IllegalStateException("ai down"));

        var response = tripService.searchDestinations("오사");

        org.assertj.core.api.Assertions.assertThat(response.results())
                .isNotEmpty()
                .allSatisfy(d ->
                        org.assertj.core.api.Assertions.assertThat(d.name() + d.country())
                                .contains("오사"));
    }

    @Test
    void searchDestinationsReturnsEmptyWhenAiEngineReturnsEmptyResults() {
        when(aiEngineClient.searchDestinations("zzz"))
                .thenReturn(new com.tripkey.infra.aiengine.dto.AiDestinationSearchResponse(java.util.List.of()));

        var response = tripService.searchDestinations("zzz");

        org.assertj.core.api.Assertions.assertThat(response.results()).isEmpty();
    }
}
