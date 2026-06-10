/**
 * 여행 상세 조회(GET /trips/{tripId}) 응답 타입.
 * SCR-03 그룹화 · SCR-04 배치 · SCR-05 확정이 공통으로 쓰는 여행 메타.
 * 백엔드는 SNAKE_CASE 직렬화이므로 필드명을 그대로 맞춘다.
 */
export type TripDetailResponse = {
  trip_id: string;
  travel_days: number;
  companion_count: number;
  destinations: string[];
  confirmed: boolean;
  created_at: string;
  /**
   * 여행 시작일(옵션 A). 온보딩에서 아직 전송하지 않으면 null 로 내려올 수 있다.
   * null 인 경우 소비 측은 출국 항공편(flight_role=outbound)에서 파생하거나 라벨을 생략한다.
   */
  start_date: string | null;
};
