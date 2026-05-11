package com.tripkey.infra.google;

import com.tripkey.domain.place.PlaceCard;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GooglePlacesClientTest {

    @Test
    void buildQueriesUsesDocumentedSearchAliasFallbackOrder() {
        GooglePlacesClient client = new GooglePlacesClient(mock(WebClient.class));
        PlaceCard card = PlaceCard.createFromAiResponse(UUID.randomUUID(), new AiPlaceCardDto(
                null,
                "도톤보리 글리코 사인",
                "place",
                "confirmed",
                "ready_partial",
                false,
                false,
                null,
                null,
                "오사카 난바",
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                "Dotonbori Glico Sign"
        ), "ai_parse");

        List<String> queries = client.buildQueries(card, List.of("오사카"));

        assertThat(queries).containsExactly(
                "도톤보리 글리코 사인 오사카 난바",
                "도톤보리 글리코 사인 오사카",
                "Dotonbori Glico Sign 오사카 난바",
                "Dotonbori Glico Sign 오사카"
        );
    }
}
