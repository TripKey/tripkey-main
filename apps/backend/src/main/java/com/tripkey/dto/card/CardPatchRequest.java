package com.tripkey.dto.card;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "카드 단건 수정 요청")
public record CardPatchRequest(
        @Schema(description = "카드 중복 허용 여부")
        Boolean allowDuplicate,
        @Schema(description = "카드 분류 상태. 예: open_question 카드를 confirmed로 확정")
        String classification,
        @Schema(description = "카드 제외 여부")
        Boolean isExcluded,
        @Schema(description = "사용자 자연어 입력. 모든 카드에 저장되며, eligible 카드에서는 card-level AI 파싱과 Places lookup을 트리거한다. open_question 카드는 failed 상태여도 notes 파싱을 트리거하지 않는다.")
        String notes,
        @Schema(description = "사용자 자유 메모. 저장만 수행하며 AI 파싱, Places lookup, enrichment 재처리를 트리거하지 않음")
        String memo,
        @Schema(description = "숙소 체크인 일시")
        String checkIn,
        @Schema(description = "숙소 체크아웃 일시")
        String checkOut,
        @Schema(description = "항공편/교통편 번호")
        String flightNumber,
        @Schema(description = "숙소 또는 교통 카드의 위치 정보")
        String location,
        @Schema(description = "교통 카드의 시간 제약")
        String timeConstraint
) {
}
