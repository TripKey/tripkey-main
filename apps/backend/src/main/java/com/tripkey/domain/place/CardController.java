package com.tripkey.domain.place;

import com.tripkey.dto.card.CardAddRequest;
import com.tripkey.dto.card.CardDto;
import com.tripkey.dto.card.CardPatchRequest;
import com.tripkey.dto.card.CardsResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/trips/{tripId}/cards")
@RequiredArgsConstructor
@Tag(name = "Cards", description = "여행 카드 조회 및 수정 API")
public class CardController {

    private final CardService cardService;

    @GetMapping
    public ResponseEntity<CardsResponse> getCards(@PathVariable UUID tripId) {
        return ResponseEntity.ok(cardService.getCards(tripId));
    }

    @PostMapping
    public ResponseEntity<CardDto> addCard(
            @PathVariable UUID tripId,
            @Valid @RequestBody CardAddRequest request) {

        CardDto created = cardService.addCard(tripId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PatchMapping("/{instanceId}")
    @Operation(
            summary = "카드 단건 수정",
            description = """
                    카드의 상태, 구조화 필드, notes, memo를 수정합니다.

                    1. 상태 변경
                    - classification / is_excluded 수정 가능
                    - classification 변경은 processing_status를 변경하지 않습니다.

                    2. 구조화 필드 수정
                    - 숙소 카드: location / check_in / check_out
                    - 교통 카드: location / time_constraint / flight_number
                    - 구조화 필드 수정 시 processing_status가 processing으로 전환되고 enrichment가 재처리됩니다.

                    3. notes 입력
                    - notes는 모든 카드에 저장됩니다.
                    - 카드가 undecided + needs_input, undecided + ready_partial, 또는 processing_status=failed 이면서
                      classification != open_question 상태이면
                      card-level AI 파싱과 Places lookup을 비동기로 트리거합니다.
                    - 트리거된 경우 PATCH 응답은 즉시 processing_status=processing을 반환합니다.
                    - open_question 카드는 notes가 있어도 파싱을 트리거하지 않고 저장만 합니다.

                    4. memo 입력
                    - memo는 사용자 자유 메모입니다.
                    - memo 입력은 AI 파싱, Places lookup, enrichment 재처리를 트리거하지 않습니다.
                    """
    )
    public ResponseEntity<CardDto> patchCard(
            @PathVariable UUID tripId,
            @PathVariable UUID instanceId,
            @RequestBody CardPatchRequest request) {

        return ResponseEntity.ok(cardService.patchCard(tripId, instanceId, request));
    }
}
