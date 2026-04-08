package com.tripkey.domain.dump;

import com.tripkey.dto.dump.DumpResultResponse;
import com.tripkey.dto.dump.DumpStatusResponse;
import com.tripkey.dto.dump.DumpSubmitRequest;
import com.tripkey.dto.dump.DumpSubmitResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/dump")
@RequiredArgsConstructor
public class DumpController {

    private final DumpService dumpService;

    /**
     * 1) Dump 텍스트 제출 + AI 파싱 시작
     */
    @PostMapping
    public ResponseEntity<DumpSubmitResponse> submitDump(
            @PathVariable UUID tripId,
            @Valid @RequestBody DumpSubmitRequest request) {

        DumpSubmitResponse response = dumpService.submit(tripId, request.dumpText());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * 2) 파싱 진행 상태 조회 (SCR-02P 프로그레스)
     */
    @GetMapping("/status")
    public ResponseEntity<DumpStatusResponse> getDumpStatus(@PathVariable UUID tripId) {
        return ResponseEntity.ok(dumpService.getStatus(tripId));
    }

    /**
     * 3) 파싱 결과 조회 (PlaceCard 배열)
     */
    @GetMapping("/result")
    public ResponseEntity<DumpResultResponse> getDumpResult(@PathVariable UUID tripId) {
        return ResponseEntity.ok(dumpService.getResult(tripId));
    }
}
