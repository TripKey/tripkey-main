package com.tripkey.infra.aiengine;

import com.tripkey.infra.aiengine.dto.AiCardParseRequest;
import com.tripkey.infra.aiengine.dto.AiDestinationSearchRequest;
import com.tripkey.infra.aiengine.dto.AiDestinationSearchResponse;
import com.tripkey.infra.aiengine.dto.AiParseRequest;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentRequest;
import com.tripkey.infra.aiengine.dto.AiNonBlockingEnrichmentResponse;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderRequest;
import com.tripkey.infra.aiengine.dto.AiOptimizeOrderResponse;
import com.tripkey.infra.aiengine.dto.AiPlaceCardDto;
import com.tripkey.infra.aiengine.dto.AiRouteRequest;
import com.tripkey.infra.aiengine.dto.AiRouteResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

@Component
@RequiredArgsConstructor
public class AiEngineClient {

    private final WebClient aiEngineWebClient;

    public AiParseResponse parseDump(AiParseRequest request) {
        try {
            AiParseResponse response = aiEngineWebClient.post()
                    .uri("/internal/ai/parse")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiParseResponse.class)
                    .block();

            if (response == null) {
                throw new IllegalStateException("ai-engine returned an empty response body");
            }

            return response;
        } catch (WebClientResponseException | WebClientRequestException e) {
            throw new IllegalStateException("Failed to call ai-engine parse endpoint", e);
        }
    }

    public AiRouteResponse route(AiRouteRequest request) {
        try {
            AiRouteResponse response = aiEngineWebClient.post()
                    .uri("/internal/ai/route")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiRouteResponse.class)
                    .block();
            if (response == null) {
                throw new IllegalStateException("ai-engine returned an empty route response body");
            }
            return response;
        } catch (WebClientResponseException | WebClientRequestException e) {
            throw new IllegalStateException("Failed to call ai-engine route endpoint", e);
        }
    }

    public AiOptimizeOrderResponse optimizeOrder(AiOptimizeOrderRequest request) {
        try {
            AiOptimizeOrderResponse response = aiEngineWebClient.post()
                    .uri("/internal/ai/route/optimize-order")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiOptimizeOrderResponse.class)
                    .block();
            if (response == null) {
                throw new IllegalStateException("ai-engine returned an empty optimize-order response body");
            }
            return response;
        } catch (WebClientResponseException | WebClientRequestException e) {
            throw new IllegalStateException("Failed to call ai-engine optimize-order endpoint", e);
        }
    }

    public AiNonBlockingEnrichmentResponse enrichCardNonBlocking(AiNonBlockingEnrichmentRequest request) {
        try {
            AiNonBlockingEnrichmentResponse response = aiEngineWebClient.post()
                    .uri("/internal/ai/enrich/non-blocking/card")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiNonBlockingEnrichmentResponse.class)
                    .block();

            if (response == null) {
                throw new IllegalStateException("ai-engine returned an empty enrichment response body");
            }

            return response;
        } catch (WebClientResponseException | WebClientRequestException e) {
            throw new IllegalStateException("Failed to call ai-engine non-blocking enrichment endpoint", e);
        }
    }

    public AiPlaceCardDto parseCard(AiCardParseRequest request) {
        try {
            AiPlaceCardDto response = aiEngineWebClient.post()
                    .uri("/internal/ai/parse/card")
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AiPlaceCardDto.class)
                    .block();

            if (response == null) {
                throw new IllegalStateException("ai-engine returned an empty card parse response body");
            }

            return response;
        } catch (WebClientResponseException e) {
            throw new IllegalStateException(
                    "Failed to call ai-engine card parse endpoint. status=%s body=%s"
                            .formatted(e.getStatusCode(), e.getResponseBodyAsString()),
                    e);
        } catch (WebClientRequestException e) {
            throw new IllegalStateException("Failed to call ai-engine card parse endpoint", e);
        }
    }

    public AiDestinationSearchResponse searchDestinations(String query) {
        try {
            AiDestinationSearchResponse response = aiEngineWebClient.post()
                    .uri("/internal/ai/destinations/search")
                    .bodyValue(new AiDestinationSearchRequest(query))
                    .retrieve()
                    .bodyToMono(AiDestinationSearchResponse.class)
                    .block();
            if (response == null) {
                throw new IllegalStateException("ai-engine returned an empty destination search response body");
            }
            return response;
        } catch (WebClientResponseException | WebClientRequestException e) {
            throw new IllegalStateException("Failed to call ai-engine destination search endpoint", e);
        }
    }
}
