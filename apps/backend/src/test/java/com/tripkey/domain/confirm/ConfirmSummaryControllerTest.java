package com.tripkey.domain.confirm;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tripkey.dto.confirm.ConfirmSummaryResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.OffsetDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfirmSummaryControllerTest {

    @Mock
    private ConfirmSummaryService confirmSummaryService;

    @InjectMocks
    private ConfirmSummaryController controller;

    @Test
    void getConfirmSummaryReturns200WithBody() throws Exception {
        UUID tripId = UUID.randomUUID();
        ConfirmSummaryResponse body = new ConfirmSummaryResponse(
                tripId,
                "completed",
                "rule_based",
                new ObjectMapper().readTree("{\"days\":[]}"),
                OffsetDateTime.parse("2026-06-18T12:00:00+09:00")
        );
        when(confirmSummaryService.getConfirmSummary(tripId)).thenReturn(body);

        ResponseEntity<ConfirmSummaryResponse> response = controller.getConfirmSummary(tripId);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(body);
    }
}
