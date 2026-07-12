/**
 * SCR-04 배치 화면이 사용하는 백엔드 응답/요청 타입.
 * 백엔드는 SNAKE_CASE 직렬화이므로 필드명을 그대로 맞춘다.
 * 카드 한 장(CardDto)은 정리 화면과 동일한 구조라 grouping-api 의 Card 를 재사용한다.
 */
import type { Card } from './grouping-api';

/** 위치 클러스터로 묶인 배치 가능 카드 그룹 (Groups04Response.available 원소). */
export type StockGroup = {
  label: string;
  group_reason: string | null;
  cards: Card[];
};

/** GET /trips/{tripId}/groups?view=04 응답. */
export type Groups04Response = {
  view: '04';
  /** 배치 가능한 카드(위치 클러스터 그룹) */
  available: StockGroup[];
  /** 재정렬이 필요한 카드 */
  pending_reorder: Card[];
  /** 입력/처리 필요 등으로 아직 배치 불가한 카드 */
  unavailable: Card[];
  /** 제외된 카드 */
  excluded: Card[];
};

/** GET /trips/{tripId}/days/{dayNumber} 응답. */
export type DayViewModel = {
  day_id: string;
  /** 출국 항공편(flight_role=outbound) */
  start_time_card: Card | null;
  /** 귀국 항공편(flight_role=inbound) */
  end_time_card: Card | null;
  cards: Card[];
};

/** POST /verify, /confirm 요청 — Day 배치 전체 스냅샷. */
export type PlacementDayItem = {
  instance_id: string;
  order: number;
  estimated_duration_min?: number | null;
};

export type PlacementDay = {
  day_number: number;
  cards: PlacementDayItem[];
};

export type PlacementSaveRequest = {
  days: PlacementDay[];
};

export type SuggestedItineraryResponse = {
  trip_id: string;
  days: Array<{
    day: number;
    label: string;
    ordered_instance_ids: string[];
    total_duration_seconds: number;
  }>;
  unplaced_cards: Array<{
    instance_id: string;
    reason: 'MISSING_COORDINATE' | 'REQUIRES_USER_DECISION' | 'DAILY_CAPACITY_EXCEEDED' | string;
  }>;
};

export type SuggestedItineraryRequest = {
  travel_style: 'BALANCED' | 'SIGHTSEEING' | 'FOOD';
  pace: 'RELAXED' | 'NORMAL' | 'PACKED';
};

/** 동선 검증 경고. */
export type RouteWarning = {
  type: string;
  day: number | null;
  instance_ids: string[];
  message: string;
  distance_meters: number | null;
  total_minutes: number | null;
};

/**
 * 인접 카드 쌍의 실측 이동 구간(verify 응답에 채워짐).
 * POST /confirm 은 현재 항상 []; 백엔드 #187 머지 후 confirm 응답에도 채워질 예정(전방호환).
 */
export type RouteLeg = {
  day: number;
  from_instance_id: string;
  to_instance_id: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  mode: string | null;
  source: string | null;
};

export type RouteLegsResponse = {
  route_legs: RouteLeg[];
};

export type PlacementSaveResponse = {
  saved: boolean;
  trip_id: string;
  skipped_instance_ids: string[];
  route_warnings: RouteWarning[];
  /** #187 전까지는 confirm 응답에서 누락/빈 배열일 수 있어 옵셔널로 둔다. */
  route_legs?: RouteLeg[];
};
