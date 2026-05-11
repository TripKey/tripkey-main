package com.tripkey.infra.google;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.tripkey.domain.place.PlaceCard;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;

@Component
@RequiredArgsConstructor
public class GooglePlacesClient {

    @Qualifier("googlePlacesWebClient")
    private final WebClient googlePlacesWebClient;

    @Value("${app.google.places.api-key:}")
    private String apiKey;

    public Optional<PlaceLookupResult> lookup(PlaceCard card, List<String> destinations) {
        if (apiKey == null || apiKey.isBlank()) {
            return Optional.empty();
        }

        return buildQueries(card, destinations).stream()
                .map(this::textSearch)
                .filter(Optional::isPresent)
                .map(Optional::get)
                .findFirst();
    }

    List<String> buildQueries(PlaceCard card, List<String> destinations) {
        String name = trimToNull(card.getName());
        String searchAlias = trimToNull(card.getSearchAlias());

        String location = trimToNull(card.getLocation());
        String firstDestination = destinations == null || destinations.isEmpty()
                ? null
                : trimToNull(destinations.get(0));

        return Stream.of(
                        join(name, location),
                        join(name, firstDestination),
                        join(searchAlias, location),
                        join(searchAlias, firstDestination)
                )
                .filter(query -> query != null && !query.isBlank())
                .distinct()
                .toList();
    }

    private Optional<PlaceLookupResult> textSearch(String query) {
        try {
            GooglePlacesTextSearchResponse response = googlePlacesWebClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/place/textsearch/json")
                            .queryParam("query", query)
                            .queryParam("language", "ko")
                            .queryParam("key", apiKey)
                            .build())
                    .retrieve()
                    .bodyToMono(GooglePlacesTextSearchResponse.class)
                    .block();

            if (response == null || response.results() == null || response.results().isEmpty()) {
                return Optional.empty();
            }

            GooglePlaceResult first = response.results().get(0);
            if (first.placeId() == null || first.geometry() == null || first.geometry().location() == null) {
                return Optional.empty();
            }

            GooglePlaceLocation location = first.geometry().location();
            return Optional.of(new PlaceLookupResult(
                    first.placeId(),
                    location.lat(),
                    location.lng(),
                    trimToNull(first.formattedAddress())
            ));
        } catch (WebClientResponseException | WebClientRequestException e) {
            return Optional.empty();
        }
    }

    private static String join(String left, String right) {
        if (left == null || left.isBlank()) {
            return null;
        }
        if (right == null || right.isBlank()) {
            return left;
        }
        return left + " " + right;
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    public record PlaceLookupResult(
            String placeId,
            Double lat,
            Double lng,
            String address
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GooglePlacesTextSearchResponse(
            List<GooglePlaceResult> results
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GooglePlaceResult(
            @JsonProperty("place_id")
            String placeId,

            @JsonProperty("formatted_address")
            String formattedAddress,

            GooglePlaceGeometry geometry
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GooglePlaceGeometry(
            GooglePlaceLocation location
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    private record GooglePlaceLocation(
            Double lat,
            Double lng
    ) {
    }
}
