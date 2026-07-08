/**
 * SCR-04 배치 '일정 배치' 화면(ArrangePage)이 통째로 받아 렌더링하는
 * 화면 데이터(ViewModel)의 타입 모음.
 *
 * 좌측 "카드 목록"(그룹별) + 우측 Day 칸반 보드 + 하단 푸터로 구성된다.
 * 1차는 정적 UI(드래그앤드롭 동작 = depth, 이후 작업)만 다룬다.
 */
import type { PlaceCardAccent, PlaceCardBadgeSpec } from './grouping';

/**
 * 좌측 "카드 목록"의 카드 한 장.
 * - draggable=true(기본): 우측에 그립 핸들 — 보드로 드래그해 배치(동작은 depth)
 * - draggable=false: 항공권처럼 Day에 고정되는 카드. 그립 대신 "이동" 힌트 +
 *   actionLabel 버튼("클릭하여 수정")을 노출한다.
 */
export type ArrangeCardViewModel = {
  /** React key + stub 핸들러 식별용. 도메인 id 아님 */
  id: string;
  name: string;
  /** 좌측 액센트 바 색. 미지정 시 'green' */
  accent?: PlaceCardAccent;
  /** 카테고리/AI 배지들(PlaceCardBadge 재사용). 좌 → 우 순서로 렌더 */
  badges?: PlaceCardBadgeSpec[];
  /** false면 고정 카드(항공권 등) — 그립 핸들 대신 "이동" 힌트를 표시. 기본 true */
  draggable?: boolean;
  /** AI 재처리 중이면 카드 흐림 + 스피너를 표시한다. */
  processing?: boolean;
  /** 카드 클릭 시 우측에서 슬라이드되어 열리는 공통 상세 패널(CardDetailPanel) 데이터 */
  detail?: ArrangeCardDetailViewModel;
  /**
   * "결정/확인이 필요한 카드"(배치 전 확인)에만 채워지는 안내 문구.
   * 카드를 클릭하면 상세 패널 안에 "무엇을 해야 하는지" 안내로 표시한다(인플레이스 해결).
   * 배치 가능 카드/제외 카드에는 undefined.
   */
  actionGuide?: string;
};

/**
 * 카드 클릭 시 열리는 공통 상세 패널(CardDetailPanel)에 들어가는 데이터.
 * 정리/배치 화면이 공유하는 CardDetailPanel 에 들어가는 화면 데이터.
 */
export type ArrangeCardDetailViewModel = {
  /** "상태 정보" 박스의 "분류" 값(예: "확정됨", "고정 일정"). 상단 상태 pill 라벨로도 쓰인다 */
  classification: string;
  /** "상태 정보" 박스의 "배치 상태" 값(예: "배치 가능", "Day 1 고정") */
  placementStatus: string;
  /** "상세 정보" — 고정 시작 시간(✈, 항공권 등). 없으면 행 생략 */
  fixedTimeLabel?: string;
  /** "상세 정보" — 위치(📍). 없으면 행 생략 */
  region?: string;
  /** "상세 정보" — 예상 소요 시간/체크인 정보(⏱). 없으면 행 생략 */
  durationLabel?: string;
  /** 이름/소요시간 표시 수정용 원본 예상 소요 시간(분). 없으면 빈 입력으로 표시 */
  estimatedDurationMin?: number | null;
  /** "상세 정보" — 원하셨던 내용(🙂). 없으면 행 생략 */
  userIntent?: string;
  /** "상세 정보" — 알아두면 좋아요(ⓘ amber 강조). 없으면 행 생략 */
  aiHint?: string;
  /** 일정 후보에 포함되어 있는지. false면 제외 그룹에 있는 카드다. */
  includedInItinerary?: boolean;
  /** "사용자 메모" textarea 초기값. 보통 ''. 입력값이 달라지면 "메모 저장"이 활성화된다 */
  memo?: string;
  /** AI가 사용자 선택/답변을 요구하는 질문. 있으면 질문/선택지 섹션을 노출한다. */
  question?: string;
  /** 질문에 대한 선택지. 현재 UX는 단일 선택 토글이다. */
  choices?: string[];
  /** 미리 선택된 선택지. */
  selectedChoices?: string[];
  /** 질문에 대한 자유 답변 초기값. */
  answer?: string;
  /**
   * true면 notes 보완 입력 → 카드 레벨 AI 재파싱(self-heal)으로 배치 가능 상태로 승격될 수 있다.
   * (BE canStartNaturalLanguageParsingFromNotes 조건을 FE 에서 미러링)
   * 결정/확인 필요(unavailable) 카드에만 true 일 수 있고, 그 외에는 undefined/false.
   */
  canResolveByNotes?: boolean;
  /** 구조화 필드 편집으로 해결 가능한 카드 여부. 숙소/교통 unavailable 카드에만 true. */
  canResolveByStructuredEdit?: boolean;
  /** 카테고리별 구조화 편집 폼 렌더링 결정용. canResolveByStructuredEdit === true 인 카드에만 채워진다. */
  structuredEditCategory?: 'accommodation' | 'transport';
  /** 구조화 편집 초기값. 숙소/교통 카드의 현재 저장된 필드값. */
  structuredFields?: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    timeConstraint?: string;
    flightNumber?: string;
  };
  /**
   * 텍스트 입력 없이 선택처리 가능 여부.
   * canResolveByNotes === true && (location != null || name != null).
   */
  canSelectProcess?: boolean;
  /** 선택처리 시 notes 로 자동 전송할 텍스트. card.location ?? card.name 우선순위. */
  selectProcessNotes?: string;
};

/** 좌측 카드 그룹 한 덩어리(항공권 / 숙소 / 지역 그룹 등). */
export type ArrangeCardGroup = {
  id: string;
  /** 그룹 제목("항공권", "숙소", "오사카" 등) */
  title: string;
  /** 제목 아래 설명 한 줄(없으면 생략) */
  description?: string;
  cards: ArrangeCardViewModel[];
};

/** 보드(Day 컬럼)에 배치된 일정 카드 한 장. */
export type ScheduledCardViewModel = {
  id: string;
  name: string;
  accent?: PlaceCardAccent;
  badges?: PlaceCardBadgeSpec[];
  /** Day 카드 클릭 시 열 공통 상세 패널 데이터 */
  detail?: ArrangeCardDetailViewModel;
  /** AI 재처리 중이면 카드 흐림 + 스피너를 표시한다. */
  processing?: boolean;
  /** 고정 시작 시간(항공권 등). 있으면 "고정 시작 시간" 라벨 + 시간 강조 카드로 렌더 */
  fixedTime?: string;
  /** 일반 일정 시간 라벨("10:30" 등). fixedTime이 없을 때만 사용 */
  timeLabel?: string;
};

/** 우측 칸반 보드의 Day 컬럼 한 개. */
export type DayColumnViewModel = {
  id: string;
  /** "Day 1" */
  dayLabel: string;
  /** "5월 10일 (토)" */
  dateLabel: string;
  cards: ScheduledCardViewModel[];
};

/** ArrangePage 가 통째로 받는 화면 데이터. fixture 의 최상위 형태. */
export type ArrangeViewModel = {
  /** 헤더(Header)에 넘기는 여행 메타 */
  summary: {
    destination: string;
    extraDestinations: number;
    travelers: number;
    dateRange: string;
  };
  /** 페이지 헤딩 블록(h1 + 보조 설명) */
  heading: { title: string; subtitle: string };
  /** 좌측 패널 제목(보통 "카드 목록") */
  cardListTitle: string;
  /** 좌측 카드 그룹 목록(렌더 순서 = 배열 순서) */
  groups: ArrangeCardGroup[];
  // 우측 Day 컬럼은 출처가 달라(GET /days/{n}) ArrangeViewModel 에 포함하지 않고
  // arrange-mapper.mapDayColumns 로 별도 구성한다.
};
// 좌측 패널의 카드 수/미배치 수는 배치(드래그앤드롭)에 따라 바뀌므로
// 고정 필드로 두지 않고 ArrangePage 에서 groups/days 상태로부터 파생한다.
