package com.tripkey.common.exception;

import com.tripkey.dto.common.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(TripNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleTripNotFound(TripNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("TRIP_NOT_FOUND", "여행 세션을 찾을 수 없어요"));
    }

    @ExceptionHandler(DumpNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleDumpNotFound(DumpNotFoundException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("TRIP_NOT_FOUND", "여행 세션을 찾을 수 없어요"));
    }

    @ExceptionHandler(DumpUrlNotAllowedException.class)
    public ResponseEntity<ErrorResponse> handleDumpUrlNotAllowed(DumpUrlNotAllowedException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("DUMP_URL_NOT_ALLOWED", e.getMessage()));
    }

    @ExceptionHandler(CardNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleCardNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("CARD_NOT_FOUND", "카드를 찾을 수 없어요"));
    }

    @ExceptionHandler(FlightCardDuplicateRoleException.class)
    public ResponseEntity<ErrorResponse> handleFlightCardDuplicateRole(FlightCardDuplicateRoleException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("FLIGHT_CARD_DUPLICATE_ROLE", e.getMessage()));
    }

    @ExceptionHandler(InvalidClassificationTransitionException.class)
    public ResponseEntity<ErrorResponse> handleInvalidClassificationTransition() {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_CLASSIFICATION_TRANSITION", "허용되지 않는 상태 변경이에요"));
    }

    @ExceptionHandler(InvalidViewParamException.class)
    public ResponseEntity<ErrorResponse> handleInvalidViewParam(InvalidViewParamException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("INVALID_VIEW_PARAM", e.getMessage()));
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingParam(MissingServletRequestParameterException e) {
        if ("view".equals(e.getParameterName())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("INVALID_VIEW_PARAM", "view 파라미터는 03 또는 04여야 해요"));
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("MISSING_PARAMETER", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        FieldError fieldError = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .orElse(null);
        String message = fieldError != null ? fieldError.getDefaultMessage() : "입력값을 확인해주세요";
        String code = "VALIDATION_ERROR";
        HttpStatus status = HttpStatus.UNPROCESSABLE_ENTITY;

        if (fieldError != null && "dumpText".equals(fieldError.getField())) {
            String validationCode = fieldError.getCode();
            String value = fieldError.getRejectedValue() == null
                    ? ""
                    : String.valueOf(fieldError.getRejectedValue()).trim();

            if ("NotBlank".equals(validationCode) || value.length() < 10) {
                code = "DUMP_TOO_SHORT";
                message = "최소 10자 이상 입력해주세요";
                status = HttpStatus.BAD_REQUEST;
            } else if ("Size".equals(validationCode) && value.length() > 3000) {
                code = "DUMP_TOO_LONG";
                message = "최대 글자 수에 도달했어요";
                status = HttpStatus.BAD_REQUEST;
            }
        }

        return ResponseEntity.status(status)
                .body(new ErrorResponse(code, message));
    }
}
