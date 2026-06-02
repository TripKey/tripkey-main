// SCR-05 (확정 전 최종 점검) mock 데이터. 화면 조회용 GET API가 생기면 mapper 로 교체.
// 카드/일정/alert 는 기존 cards·days API 로 커버. 체크리스트는 alert_cards(practical) 파생(연동 post-MVP).
// hero stats(4종)·실제 Day 이동시간(Maps 연동)은 컨트랙트에 없음 — MVP 범위 밖.
import type { PlaceCardBadgeSpec } from '@/types/grouping';

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
  /** Day Summary 카드의 큰 제목 ("Day 1 - 오사카 도착과 시내 적응") */
  title: string;
  /** Day Summary 카드의 한두 줄 설명 */
  summary: string;
  /** 총 이동시간 (예: "48분") */
  totalMove: string;
  /** 총 소요시간 (예: "6시간 30분") */
  totalSpend: string;
  /** 카드 맥락 기반 일정 — 본문 메인 리스트 */
  contextCards: ConfirmCardViewModel[];
  /** Day 체크리스트 — 우측 사이드 */
  dayChecklist: ConfirmDayChecklistItem[];
};

export type ConfirmViewModel = {
  /** Header(상단 공통)에 넘기는 여행 메타 — 배치 fixture 의 summary 와 동일 구조 */
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
  /** 좌측 사이드 — Alert Cards */
  alertCards: ConfirmAlertCard[];
  /** Day 탭 + 본문 */
  days: ConfirmDayViewModel[];
};

export const CONFIRM_FIXTURE: ConfirmViewModel = {
  summary: {
    destination: '교토',
    extraDestinations: 2,
    travelers: 2,
    dateRange: '5월 10일 ~ 5월 14일',
  },
  hero: {
    title: '간사이 봄 여행',
    destinations: ['오사카', '교토', '나라'],
    travelers: 2,
    durationLabel: '4박 5일',
    stats: [
      { label: '여행 리듬', value: '오전 집중형' },
      { label: '이동 성향', value: '환승 적게' },
      { label: '숙소 전략', value: '오사카/교토 분산' },
      { label: '남은 변수', value: '교통 1건 확정 필요' },
    ],
  },
  tripChecklist: [
    { id: 'passport', label: '여권 유효기간 확인', done: false },
    { id: 'flight', label: '항공권 출력 / 모바일 저장', done: false },
    { id: 'voucher', label: '숙소 바우처 준비', done: false },
    { id: 'insurance', label: '여행자 보험 가입', done: false },
    { id: 'pass', label: '교통패스 예약', done: false },
    { id: 'fx', label: '환전', done: false },
  ],
  alertCards: [
    {
      id: 'a1',
      kind: '실무 알림',
      category: 'practical',
      body: '교토역 → 오사카 이동 수단이 아직 확정되지 않았어요. 짐이 많다면 환승이 적은 경로가 더 적합해요.',
    },
    {
      id: 'a2',
      kind: '출발 준비',
      category: 'practical',
      body: '간사이 공항 출발 동선은 숙소 체크아웃 시간과 함께 다시 확인하는 편이 안전해요.',
    },
    {
      id: 'a3',
      kind: 'AI 인사이트',
      category: 'insight',
      body: '유니버설 스튜디오 재팬, 아라시야마 대나무숲, 후시미 이나리처럼 이른 시간 가치가 큰 장소가 섞여 있어 오전 집중형 일정으로 보입니다.',
    },
    {
      id: 'a4',
      kind: 'AI 인사이트',
      category: 'insight',
      body: '숙소와 공항/교통 카드는 중복 배치가 가능하므로 Day 재조정 여지가 남아 있어요.',
    },
  ],
  days: [
    {
      id: 'day-1',
      dayLabel: 'Day 1',
      title: 'Day 1 - 오사카 도착과 시내 적응',
      summary:
        '오사카 도착 후 시내 흐름을 익히는 날이에요. 식사와 전망, 체크인을 부드럽게 연결했습니다.',
      totalMove: '48분',
      totalSpend: '6시간 30분',
      contextCards: [
        {
          id: 'c1',
          order: 1,
          name: '난바 체크인',
          badges: [{ kind: 'category', category: 'lodging' }],
          timeLabel: '16:00',
          region: '오사카',
          userNote: '오사카 숙소로 난바 근처를 잡았어요',
        },
        {
          id: 'c2',
          order: 2,
          name: '도톤보리 맛집 투어',
          badges: [{ kind: 'category', category: 'food' }],
          timeLabel: '18:00',
          region: '오사카',
          userNote: '도톤보리 맛집 여러 곳 둘러볼 예정',
          aiTip: '저녁 시간대는 웨이팅이 길 수 있어요',
        },
        {
          id: 'c3',
          order: 3,
          name: '하루카스 300 전망대',
          badges: [{ kind: 'category', category: 'place' }],
          timeLabel: '20:00',
          region: '오사카',
          aiTip: '날씨 맑은 날 방문 추천',
        },
      ],
      dayChecklist: [
        {
          id: 'd1-cash',
          label: '현금 인출 여부 확인',
          hint: 'To-do',
          done: false,
        },
        {
          id: 'd1-checkin',
          label: '숙소 체크인 시간 재확인',
          hint: '난바 체크인',
          done: false,
        },
      ],
    },
    {
      id: 'day-2',
      dayLabel: 'Day 2',
      title: 'Day 2 - 교토 핵심 동선',
      summary: '교토 시내 주요 사찰과 거리를 도보 중심으로 둘러보는 날.',
      totalMove: '1시간 10분',
      totalSpend: '7시간',
      contextCards: [],
      dayChecklist: [],
    },
    {
      id: 'day-3',
      dayLabel: 'Day 3',
      title: 'Day 3 - 아라시야마',
      summary: '오전 일찍 아라시야마로 이동, 대나무숲 → 도게쓰교 코스.',
      totalMove: '1시간 30분',
      totalSpend: '6시간',
      contextCards: [],
      dayChecklist: [],
    },
    {
      id: 'day-4',
      dayLabel: 'Day 4',
      title: 'Day 4 - 나라 당일치기',
      summary: '나라 공원과 도다이지 중심의 짧은 당일 코스.',
      totalMove: '2시간',
      totalSpend: '5시간 30분',
      contextCards: [],
      dayChecklist: [],
    },
    {
      id: 'day-5',
      dayLabel: 'Day 5',
      title: 'Day 5 - 출국',
      summary: '간사이 공항으로 이동, 마지막 쇼핑과 출국.',
      totalMove: '1시간',
      totalSpend: '3시간',
      contextCards: [],
      dayChecklist: [],
    },
  ],
};
