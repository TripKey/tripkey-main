package com.tripkey.infra.aiengine;

import com.tripkey.infra.aiengine.dto.AiParseRequest;
import com.tripkey.infra.aiengine.dto.AiParseResponse;
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
}
