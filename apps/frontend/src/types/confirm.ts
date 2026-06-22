// SCR-05 (확정 전 최종 점검) 화면 ViewModel 타입.
// 백엔드 응답(GET /trips·/cards·/days)을 confirm-mapper 가 이 형태로 변환한다.
import type { PlaceCardBadgeSpec } from '@/types/grouping';
import type { Coordinates } from '@/types/grouping-api';

export type ConfirmStat = {
  label: string;
  value: string;
};

export type ConfirmAlertKind = '실무 알림' | '출발 준비' | 'AI 인사이트';

export type ConfirmAlertCard = {
  id: string;
  /** 표시용 라벨 */
  kind: ConfirmAlertKind;
  /** 색/분류 축 — 컨트랙트 alert_cards.category 정렬. practical=amber, insight=blue */
  category: 'practical' | 'insight';
  body: string;
};

export type ConfirmChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

// 확정 화면의 카드 1장. 배치(SCR-04) ScheduledCardViewModel + 사용자 맥락/AI 팁.
export type ConfirmCardViewModel = {
  id: string;
  /** 좌측 동그라미 번호 (1, 2, 3 …) */
  order: number;
  name: string;
  badges?: PlaceCardBadgeSpec[];
  /** 시간 라벨 (예: "16:00") */
  timeLabel?: string;
  /** 지역 라벨 (예: "오사카") */
  region?: string;
  /** 사용자 맥락 — 보라색 칩 안 본문 */
  userNote?: string;
  /** AI 팁 — 노란색 칩 안 본문 */
  aiTip?: string;
  /** 지도 마커용 좌표 — 없으면 마커 스킵 */
  coordinates?: Coordinates;
};

export type ConfirmDayChecklistItem = {
  id: string;
  label: string;
  /** "To-do" 또는 연결된 카드 이름 같은 보조 라벨 */
  hint?: string;
  done: boolean;
};

// 확정 화면의 Day 한 칸. 배치(SCR-04) DayColumnViewModel 의 (id, dayLabel) 확장.
export type ConfirmDayViewModel = {
  id: string;
  /** "Day 1" — 탭 라벨 */
  dayLabel: string;
  /** Day Summary 카드의 큰 제목 ("Day 1 · 오사카 외 2곳") */
  title: string;
  /** Day Summary 카드의 한두 줄 설명 (BE 내러티브 미구현 시 빈 문자열) */
  summary: string;
  /** 총 이동시간 (예: "48분"). route_legs 미연동 시 "-" */
  totalMove: string;
  /** 총 소요시간 (예: "6시간 30분") */
  totalSpend: string;
  /** 카드 맥락 기반 일정 — 본문 메인 리스트 */
  contextCards: ConfirmCardViewModel[];
  /** Day 체크리스트 — 우측 사이드 (scope=day alert 파생) */
  dayChecklist: ConfirmDayChecklistItem[];
};

export type ConfirmViewModel = {
  /** Header(상단 공통)에 넘기는 여행 메타 */
  summary: {
    destination: string;
    extraDestinations: number;
    travelers: number;
    dateRange: string;
  };
  /** 보라색 히어로 카드 */
  hero: {
    title: string;
    destinations: string[];
    travelers: number;
    durationLabel: string;
    stats: ConfirmStat[];
  };
  /** 좌측 사이드 — 여행 전반 체크리스트 */
  tripChecklist: ConfirmChecklistItem[];
  /** 좌측 사이드 — Alert Cards (scope=trip) */
  alertCards: ConfirmAlertCard[];
  /** Day 탭 + 본문 */
  days: ConfirmDayViewModel[];
};
