package com.tripkey.domain.dump;

import com.tripkey.dto.dump.DumpSubmitRequest;
import com.tripkey.dto.dump.DumpSubmitResponse;
import com.tripkey.dto.dump.ParseJobStatusResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}")
@RequiredArgsConstructor
public class DumpController {

    private final DumpService dumpService;

    @PostMapping("/dump")
    public ResponseEntity<DumpSubmitResponse> submitDump(
            @PathVariable UUID tripId,
            @Valid @RequestBody DumpSubmitRequest request) {

        DumpSubmitResponse response = dumpService.submit(tripId, request);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    @GetMapping("/parse/jobs/{jobId}/status")
    public ResponseEntity<ParseJobStatusResponse> getParseJobStatus(
            @PathVariable UUID tripId,
            @PathVariable UUID jobId) {

        return ResponseEntity.ok(dumpService.getStatus(tripId, jobId));
    }
}
