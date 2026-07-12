package com.tripkey.infra.aiengine;

import com.tripkey.common.exception.AiEngineCallException;
import com.tripkey.common.exception.AiEngineUnavailableException;
import com.tripkey.dto.chat.ChatContextDto;
import com.tripkey.infra.aiengine.dto.AiChatParseRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.reactive.function.client.ClientResponse;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AiEngineClientChatTest {

    @Test
    void mapsServiceUnavailableToDedicatedException() {
        AiEngineClient client = clientReturning(HttpStatus.SERVICE_UNAVAILABLE);

        assertThatThrownBy(() -> client.parseChat(request()))
                .isInstanceOf(AiEngineUnavailableException.class);
    }

    @Test
    void mapsUnprocessableEntityAndOtherErrorsToBadGatewayException() {
        AiEngineClient client = clientReturning(HttpStatus.UNPROCESSABLE_ENTITY);

        assertThatThrownBy(() -> client.parseChat(request()))
                .isInstanceOf(AiEngineCallException.class);
    }

    private static AiEngineClient clientReturning(HttpStatus status) {
        WebClient webClient = WebClient.builder()
                .exchangeFunction(ignored -> Mono.just(ClientResponse.create(status).build()))
                .build();
        return new AiEngineClient(webClient);
    }

    private static AiChatParseRequest request() {
        return new AiChatParseRequest(
                UUID.randomUUID(), "추천해줘", List.of("오사카"), (short) 3, (short) 2,
                new ChatContextDto(List.of(), List.of()), List.of(), 3);
    }
}
