package com.tripkey.common.exception;

import com.tripkey.dto.common.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
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

    @ExceptionHandler(DumpNotCompletedException.class)
    public ResponseEntity<ErrorResponse> handleDumpNotCompleted(DumpNotCompletedException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("DUMP_NOT_COMPLETED", e.getMessage()));
    }

    @ExceptionHandler(DumpUrlNotAllowedException.class)
    public ResponseEntity<ErrorResponse> handleDumpUrlNotAllowed(DumpUrlNotAllowedException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse("DUMP_URL_NOT_ALLOWED", e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(f -> f.getDefaultMessage())
                .orElse("입력값을 확인해주세요");

        String code = "VALIDATION_ERROR";
        if (message.contains("blank") || message.contains("10자")) {
            code = "DUMP_TOO_SHORT";
            message = "최소 10자 이상 입력해주세요";
        } else if (message.contains("3000")) {
            code = "DUMP_TOO_LONG";
            message = "최대 글자 수에 도달했어요";
        }

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(code, message));
    }
}
