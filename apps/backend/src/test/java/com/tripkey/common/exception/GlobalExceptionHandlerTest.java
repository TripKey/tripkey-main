package com.tripkey.common.exception;

import com.tripkey.dto.common.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.lang.reflect.Method;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsChatExceptionsToContractStatuses() {
        assertThat(handler.handleChatParseBadRequest(new ChatParseBadRequestException("bad")).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(handler.handleAiEngineUnavailable().getStatusCode())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(handler.handleAiEngineCall().getStatusCode())
                .isEqualTo(HttpStatus.BAD_GATEWAY);
    }

    @Test
    void handleValidationReturnsDumpTooShortForBlankDumpText() throws Exception {
        MethodArgumentNotValidException exception = buildValidationException(
                "dumpText",
                " ",
                "NotBlank",
                "must not be blank"
        );

        ResponseEntity<ErrorResponse> response = handler.handleValidation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("DUMP_TOO_SHORT");
        assertThat(response.getBody().message()).isEqualTo("최소 10자 이상 입력해주세요");
    }

    @Test
    void handleValidationReturnsDumpTooLongForOverLimitDumpText() throws Exception {
        MethodArgumentNotValidException exception = buildValidationException(
                "dumpText",
                "a".repeat(3001),
                "Size",
                "10자 이상 3000자 이하로 입력해주세요"
        );

        ResponseEntity<ErrorResponse> response = handler.handleValidation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("DUMP_TOO_LONG");
        assertThat(response.getBody().message()).isEqualTo("최대 글자 수에 도달했어요");
    }

    @Test
    void handleValidationKeepsGenericValidationErrorForOtherFields() throws Exception {
        MethodArgumentNotValidException exception = buildValidationException(
                "travelDays",
                null,
                "NotNull",
                "여행 일수를 입력해주세요"
        );

        ResponseEntity<ErrorResponse> response = handler.handleValidation(exception);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("VALIDATION_ERROR");
        assertThat(response.getBody().message()).isEqualTo("여행 일수를 입력해주세요");
    }

    private MethodArgumentNotValidException buildValidationException(
            String field,
            Object rejectedValue,
            String validationCode,
            String defaultMessage
    ) throws NoSuchMethodException {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "request");
        bindingResult.addError(new FieldError(
                "request",
                field,
                rejectedValue,
                false,
                new String[]{validationCode},
                null,
                defaultMessage
        ));

        Method method = GlobalExceptionHandlerTest.class.getDeclaredMethod("dummyValidatedMethod", String.class);
        MethodParameter methodParameter = new MethodParameter(method, 0);
        return new MethodArgumentNotValidException(methodParameter, bindingResult);
    }

    @SuppressWarnings("unused")
    private void dummyValidatedMethod(String ignored) {
    }
}
