/**
 * SCR-03 그룹화 '정보 정리하기' 화면(GroupingPage)이 통째로 받아 렌더링하는
 * 화면 데이터(ViewModel)의 타입 모음.
 */
import type { LucideIcon } from 'lucide-react';

import type { Coordinates } from './grouping-api';

export type PlaceCardAccent = 'blue' | 'green' | 'amber' | 'red' | 'muted';

export type PlaceCategory =
  | 'place' // 장소
  | 'lodging' // 숙소
  | 'food' // 맛집 /
  | 'activity' // 활동
  | 'shopping' // 쇼핑
  | 'transport'; // 교통, 공항

export type PlaceCardBadgeSpec =
  | { kind: 'category'; category: PlaceCategory }
  // tone: fail='× 실패'(빨강) / done='완료'(초록) / pending='미결정'(amber) / info='질문 필요'(파랑)
  | {
      kind: 'status';
      label: string;
      tone: 'fail' | 'done' | 'pending' | 'info';
    }
  | { kind: 'ai' }
  | { kind: 'more'; label?: string };

/**
 * 액션 카드 (ActionGroupSection) 의 4가지 variant.
 *  - select     : "선택이 필요한 카드들" — fsd `0-6` 의 Open Question / Choice Conflict 계열
 *  - edit       : "수정이 필요한 카드들" — 파싱 실패 / 오타 등 보정 필요
 *  - review     : "확인만 하면 되는 카드들" — fsd `0-6` 의 Confirmed
 *  - unassigned : "제외된 카드들" — fsd `0-6` 의 Unassigned(그룹 배정 실패/제거/파싱 실패)
 */
export type ActionGroupVariant = 'select' | 'edit' | 'review' | 'unassigned';

/**
 * 사이드바 "여행 요약"의 카드 상태 분포 배지 색상 톤.
 * (입력=neutral / 선택=select(노랑) / 수정=edit(빨강) / 완료=done(초록) / 제외=neutral)
 */
export type SummaryStatTone = 'neutral' | 'select' | 'edit' | 'done';

/**
 * PlaceCard 한 장을 그리기 위한 ViewModel. fixture 의 카드 1개 = 이 객체 1개.
 */
export type PlaceCardViewModel = {
  /** fixture 내 React key + stub 핸들러 식별용. 도메인 id 아님 */
  id: string;
  name: string;
  /** 메타 행 — 지역 라벨("오사카" 등). 없으면 메타 행 숨김 */
  region?: string;
  /** 메타 행 — 체류시간 라벨("8시간", "1시간 30분", "0분"). 없으면 메타 행 숨김 */
  durationLabel?: string;
  /** 좌측 액센트 바 색. 미지정 시 'green' */
  accent?: PlaceCardAccent;
  /** 우상단 배지들. 배열 순서대로 좌 → 우로 렌더 */
  badges?: PlaceCardBadgeSpec[];
  /** 하단 리마인더 배너 단일 메시지(fsd `0-1` remind[] / Open Question AI 힌트). 1차는 1개만 */
  reminder?: string;
  /** 처리 중(고맥락 재처리 등) — 카드 흐림 + 중앙 스피너 + 인터랙션 차단(fsd SCR-03 updating) */
  processing?: boolean;
  /** 데이터 수신 중 — 스켈레톤 렌더(fsd `0-1` loading). 1차 목데이터에선 미사용이지만 동일 컴포넌트로 지원 */
  loading?: boolean;
  /** 제외/에러 카드의 보조 액션 버튼 라벨("수정하기" 등). 1차는 동작 없음(stub) */
  actionLabel?: string;
  /**
   * "확인만 하면 되는 카드들"(review) 상세보기 사이드 패널(CardDetailPanel) 데이터.
   * 채워져 있으면 카드 행을 클릭했을 때 우측에서 상세 패널이 슬라이드되어 열린다.
   * (1차: review 섹션 카드들에만 채워 둠.)
   */
  detail?: CardDetailViewModel;
  /**
   * "선택이 필요한 카드들"(select) 상세보기 사이드 패널(SelectCardDetailPanel) 데이터.
   * 채워져 있으면 카드 행을 클릭했을 때 우측에서 select 상세 패널이 슬라이드되어 열린다.
   * (1차: select 섹션 카드들에만 채워 둠. detail / selectDetail / editDetail 우선순위는 detail > editDetail > selectDetail.)
   */
  selectDetail?: SelectCardDetailViewModel;
  /**
   * "수정이 필요한 카드들"(edit) 상세보기 사이드 패널(EditCardDetailPanel) 데이터.
   * 채워져 있으면 카드 행을 클릭했을 때 우측에서 edit 상세 패널이 슬라이드되어 열린다.
   * (1차: edit 섹션 카드들에만 채워 둠.)
   */
  editDetail?: EditCardDetailViewModel;
};

/**
 * "확인만 하면 되는 카드들" 상세보기 사이드 패널(CardDetailPanel)에 들어가는 추가 데이터.
 *
 * 시안(SCR-03 review 카드 상세 — 화면 오른쪽에서 슬라이드되는 패널):
 *   [확정됨][📍 장소]                                     ✕
 *   유니버설 스튜디오 재팬
 *   ─────────────────────────────────────────────────
 *   상태 정보 : 분류=확정됨 / 배치 상태=배치 가능        ← 회색 박스, 2칼럼
 *   상세 정보 : 📍위치 / ⏱예상 소요 시간 / 🙂원하셨던 내용 / ⓘ알아두면 좋아요(amber)
 *   사용자 메모 : [textarea] + 회색 안내문구
 *   ─────────────────────────────────────────────────
 *   [일정에 포함된 항목이에요]                       [제외하기]
 *   ─────────────────────────────────────────────────
 *   [   닫기   ]                              [  메모 저장  ]   ← 메모 비어있으면 저장 disabled
 *
 * "상단 카테고리 배지 / 위치 / 예상 소요 시간"은 PlaceCardViewModel 의
 * badges / region / durationLabel 을 그대로 재사용한다(region·durationLabel 이 없으면
 * 해당 "상세 정보" 행은 생략). 여기서는 패널에만 필요한 필드만 정의한다.
 */
export type CardDetailViewModel = {
  /** "상태 정보" 박스의 "분류" 값. 상단 상태 pill 라벨로도 같이 쓰인다. review 카드라 보통 "확정됨" */
  classification: string;
  /** "상태 정보" 박스의 "배치 상태" 값("배치 가능" 등) */
  placementStatus: string;
  /** "상세 정보" — "원하셨던 내용"(사용자가 처음 적은 의도 한 줄). 없으면 그 행 생략 */
  userIntent?: string;
  /** 이름/소요시간 표시 수정용 원본 예상 소요 시간(분). 없으면 빈 입력으로 표시 */
  estimatedDurationMin?: number | null;
  /**
   * "상세 정보" — "알아두면 좋아요"(amber 강조 행). 없으면 카드의 reminder 를 대신 쓰고,
   * 그것도 없으면 행 자체를 생략한다.
   * (리스트의 reminder 배너 = 짧은 넛지 / 패널의 이 행 = 좀 더 자세한 AI 노트 — 라는 구분)
   */
  aiHint?: string;
  /** Google Maps 외부 링크용 장소 식별자. 있으면 좌표/검색어보다 우선한다. */
  placeId?: string | null;
  /** Google Maps 외부 링크 검색어 보강용 위치 라벨. */
  location?: string | null;
  /** Google Maps 외부 링크 검색어 보강용 주소. */
  address?: string | null;
  /** 장소 좌표(있으면 상세 패널에 지도 표시). 미해결/미도착 카드는 없음 */
  coordinates?: Coordinates;
  /** "사용자 메모" textarea 초기값. 보통 ''(저장된 메모가 있으면 그 값). 입력값이 이 값과 달라지면 "메모 저장"이 활성화된다 */
  memo?: string;
  /**
   * 일정 포함 여부. 하단 박스 + 풋터 변형을 가른다.
   *   - true  : "일정에 포함된 항목이에요" + [제외하기]  / 풋터 [닫기][메모 저장]
   *   - false : "현재 제외된 항목이에요"   + [포함하기](filled) / 풋터 [닫기] 하나(시안 "제외된 항목 상세")
   */
  includedInItinerary: boolean;
};

/**
 * "선택이 필요한 카드들"(select) 상세보기 사이드 패널(SelectCardDetailPanel)에 들어가는 추가 데이터.
 *
 * 시안(SCR-03 select 카드 상세 — 화면 오른쪽에서 슬라이드되는 패널):
 *   [미결정][🍴 맛집]                                       ✕
 *   도톤보리 맛집 투어
 *   ─────────────────────────────────────────────────
 *   상태 정보 : 분류=미결정 / 배치 상태=일부 부족           ← 회색 박스, 2칼럼 (review 패널과 동일)
 *   상세 정보 : 📍위치 / ⏱예상 소요 시간 / 🙂원하셨던 내용 / ⓘ알아두면 좋아요(amber)
 *   ─────────────────────────────────────────────────
 *   질문 / 입력 :                                          ← 이 패널만의 영역
 *     ┌ 질문 ─ "도톤보리에서 방문할 맛집을 선택해주세요" ┐  · 옅은 인디고 박스
 *     [이치란 라멘] [쿠이다오레] [타코야키 도라쿠]          · 선택지 칩(다중 선택 토글)
 *     질문에 대한 답변
 *     [ textarea: "선택한 내용 외에 더 남기고 싶은 내용을 적어주세요..." ]
 *   ─────────────────────────────────────────────────
 *   사용자 메모 : [textarea] + 회색 안내문구              ← review 패널과 동일
 *   ─────────────────────────────────────────────────
 *   [일정에 포함된 항목이에요]                       [제외하기]  ← review 패널과 동일
 *   ─────────────────────────────────────────────────
 *   [   닫기   ]        [ 확인하기 ]        [ 메모 저장 ]
 *      · 확인하기 : 칩을 하나도 안 고르고 답변도 비어있으면 disabled
 *      · 메모 저장 : 메모가 초기값과 같으면 disabled
 *
 * "상단 카테고리 배지 / 위치 / 예상 소요 시간"은 PlaceCardViewModel 의
 * badges / region / durationLabel 을 그대로 재사용한다(없으면 해당 행 생략).
 */
export type SelectCardDetailViewModel = {
  /** "상태 정보" 박스의 "분류" 값. 상단 상태 pill(amber) 라벨로도 같이 쓰인다. select 카드라 보통 "미결정" */
  classification: string;
  /** "상태 정보" 박스의 "배치 상태" 값("일부 부족" 등) */
  placementStatus: string;
  /** "상세 정보" — "원하셨던 내용"(사용자가 처음 적은 의도 한 줄). 없으면 그 행 생략 */
  userIntent?: string;
  /** 이름/소요시간 표시 수정용 원본 예상 소요 시간(분). 없으면 빈 입력으로 표시 */
  estimatedDurationMin?: number | null;
  /**
   * "상세 정보" — "알아두면 좋아요"(amber 강조 행). 없으면 카드의 reminder 를 대신 쓰고,
   * 그것도 없으면 행 자체를 생략한다.
   */
  aiHint?: string;
  /** Google Maps 외부 링크용 장소 식별자. 있으면 좌표/검색어보다 우선한다. */
  placeId?: string | null;
  /** Google Maps 외부 링크 검색어 보강용 위치 라벨. */
  location?: string | null;
  /** Google Maps 외부 링크 검색어 보강용 주소. */
  address?: string | null;
  /** "질문 / 입력" — AI 가 던지는 질문 한 줄(fsd `0-6` Open Question / Choice Conflict) */
  question: string;
  /** "질문 / 입력" — 사용자가 고를 수 있는 선택지 칩들. 다중 선택 허용. 빈 배열이면 칩 영역 생략 */
  choices: string[];
  /** 미리 골라져 있는 선택지(보통 빈 배열) */
  selectedChoices?: string[];
  /** "질문에 대한 답변" textarea 초기값. 보통 '' */
  answer?: string;
  /** "사용자 메모" textarea 초기값. 보통 ''. 입력값이 이 값과 달라지면 "메모 저장"이 활성화된다 */
  memo?: string;
  /** true → 하단 "일정에 포함된 항목이에요" + [제외하기] / false → "현재 제외된 항목이에요" + [포함하기] */
  includedInItinerary: boolean;
};

/**
 * "수정이 필요한 카드들"(edit) 상세보기 사이드 패널(EditCardDetailPanel)에 들어가는 추가 데이터.
 *
 * 시안(SCR-03 edit 카드 상세 — 화면 오른쪽에서 슬라이드되는 패널):
 *   [질문 필요][··· 기타]                                   ✕   ← 상단 pill 은 "질문 필요"(파랑/info) 고정
 *   와사카 성
 *   ─────────────────────────────────────────────────
 *   ⓧ 해결이 필요합니다 / 이 항목은 배치할 수 없습니다 / 사유: {reason}   ← 빨강 알림 배너(항상)
 *   ⓧ 처리 중 오류가 발생했습니다 / {retryNotice}                         ← 빨강 알림 배너(retryNotice 있을 때만)
 *   ─────────────────────────────────────────────────
 *   상태 정보 : 분류={classification} / 배치 상태={placementStatus}        ← 회색 박스, 2칼럼(공통)
 *   상세 정보 : 🙂원하셨던 내용 / ⓘ알아두면 좋아요(amber)                  ← (edit 카드는 보통 위치/시간이 없음)
 *   ─────────────────────────────────────────────────
 *   질문 / 입력 :                                          ← 옅은 인디고 질문 박스 + 답변 textarea(칩은 없음)
 *     ┌ 질문 ─ {question} ┐
 *     질문에 대한 답변
 *     [ textarea: "필요한 내용을 자유롭게 입력해주세요..." ]
 *   ─────────────────────────────────────────────────
 *   사용자 메모 : [textarea] + 회색 안내문구              ← 공통
 *   ─────────────────────────────────────────────────
 *   [   닫기   ]        [ 확인하기 ]        [ 메모 저장 ]
 *      · 확인하기 : 답변이 비어있으면 disabled
 *      · 메모 저장 : 메모가 초기값과 같으면 disabled
 *
 * "상단 더보기 배지 / 위치 / 예상 소요 시간"은 PlaceCardViewModel 의 badges('more') / region /
 * durationLabel 을 그대로 재사용한다(없으면 해당 요소 생략). edit 카드는 보통 region·durationLabel 이
 * 없어 "상세 정보"가 원하셨던 내용 + 알아두면 좋아요만으로 끝난다.
 * 일정 포함/제외 박스는 없다(edit 카드는 아직 일정에 배치되지 않았으므로).
 */
export type EditCardDetailViewModel = {
  /** "상태 정보" 박스의 "분류" 값(예: "질문있음"). 상단 pill 은 별도로 "질문 필요"(info 톤) 고정 */
  classification: string;
  /** "상태 정보" 박스의 "배치 상태" 값(예: "배치 불가") */
  placementStatus: string;
  /** "상세 정보" — "원하셨던 내용"(사용자가 처음 적은 의도 한 줄). 없으면 그 행 생략 */
  userIntent?: string;
  /** 이름/소요시간 표시 수정용 원본 예상 소요 시간(분). 없으면 빈 입력으로 표시 */
  estimatedDurationMin?: number | null;
  /**
   * "상세 정보" — "알아두면 좋아요"(amber 강조 행). 없으면 카드의 reminder 를 대신 쓰고,
   * 그것도 없으면 행 자체를 생략한다.
   */
  aiHint?: string;
  /** 첫 번째 빨강 알림 배너의 "사유: …" — 배치할 수 없는 원인 한 줄(예: "오타인 것 같아요") */
  reason: string;
  /** 두 번째 빨강 알림 배너("처리 중 오류가 발생했습니다")의 본문. 없으면 그 배너 자체를 생략 */
  retryNotice?: string;
  /** "질문 / 입력" — 사용자에게 던지는 보정 질문 한 줄(예: "오타인 것 같아요. 실제 장소명을 확인해주세요.") */
  question: string;
  /** "질문에 대한 답변" textarea 초기값. 보통 '' */
  answer?: string;
  /** "사용자 메모" textarea 초기값. 보통 ''. 입력값이 이 값과 달라지면 "메모 저장"이 활성화된다 */
  memo?: string;
  /** notes 보완 입력 초기값(장소 정보 보완 섹션). 구조화 편집과 분리된 notes 경로에 쓰인다. */
  notes?: string;
  /** 구조화 편집 초기값. 숙소/교통 edit 카드의 현재 저장된 필드값. */
  structuredFields?: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    timeConstraint?: string;
    flightNumber?: string;
  };
  /** 카테고리별 구조화 편집 폼 렌더링 결정용. */
  structuredEditCategory?: 'accommodation' | 'transport';
  /** 구조화 필드 편집으로 해결 가능한 처리필요 카드 여부. 숙소/교통 fix_required 카드에만 true. */
  canResolveByStructuredEdit?: boolean;
  /** notes 보완 입력으로 AI 재파싱 가능 여부(BE canStartNaturalLanguageParsingFromNotes 미러링). */
  canResolveByNotes?: boolean;
  /**
   * 텍스트 입력 없이 선택처리 가능 여부.
   * canResolveByNotes === true && (location != null || name != null).
   */
  canSelectProcess?: boolean;
  /** 선택처리 시 notes 로 자동 전송할 텍스트. */
  selectProcessNotes?: string;
};

/** "해야 할 액션" 버킷 1개(헤더 + 그 안의 카드들). */
export type ActionGroup = {
  variant: ActionGroupVariant;
  /** 헤더 제목("선택이 필요한 카드들" 등) */
  title: string;
  /** 헤더 보조 텍스트("1개의 카드가 선택이 필요해요" 등) */
  countLabel: string;
  /** 처음 펼친 상태로 둘지. 시안은 'select' 만 접힌 상태로 시작(접기/펼치기 데모 겸용) */
  defaultOpen: boolean;
  cards: PlaceCardViewModel[];
};

//우측 고정 박스 여행 요약
export type TripSummaryViewModel = {
  //여행지
  destinations: string[];
  //일정 텍스트
  dateRange: string;
  //숙박 일수
  nights: number;
  days: number;
  //동행자
  travelers: number;
  //예약 여부
  reservation?: string;
  //전체 카드 개수
  totalCards?: number;
  //상태 상태 배지
  cardStats?: { label: string; count: number; tone: SummaryStatTone }[];
  //정리 완료도
  completionPct?: number;
};

/** GroupingPage 가 통째로 받는 화면 데이터. fixture 의 최상위 형태. */
export type GroupingViewModel = {
  /** 페이지 헤딩 블록(h1 + 보조 설명) */
  heading: { title: string; subtitle: string };
  /** 상단 "정리 진행률" 카드 데이터 */
  progress: { percent: number; activeCount: number; doneCount: number };
  /** "해야 할 액션" 버킷 목록(렌더 순서 = 배열 순서) */
  groups: ActionGroup[];
  /** 우측 사이드바 데이터 */
  summary: TripSummaryViewModel;
};

/** PlaceCardBadge 내부의 카테고리 → 아이콘/라벨 매핑 한 칸의 타입. */
export type CategoryMeta = { icon: LucideIcon; label: string };
