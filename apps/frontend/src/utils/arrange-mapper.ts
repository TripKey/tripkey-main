// 백엔드 응답(Groups04Response / CardsResponse) → 배치 화면 ViewModel 변환과
// 배치 저장(verify/confirm) 요청 payload 구성을 담당한다.
//
// 화면 분할 규칙:
//  - 좌측 "카드 목록"  = 아직 배치되지 않은(day == null) 카드. Groups04 의 클러스터 라벨을 그대로 쓴다.
//  - 우측 Day 보드     = 배치된 카드. day 별 그룹핑/정렬/항공편 분리는 FE 가 재현하지 않고
//                        백엔드 GET /days/{n}(DayViewService) 결과(DayViewModel)를 그대로 따른다.
//                        (start_time_card=출국편, end_time_card=귀국편, cards=나머지 createdAt 순)
// 백엔드 verify/confirm 은 스냅샷 시맨틱(요청에 없는 카드는 day 초기화)이므로
// 저장 시 각 Day 의 모든 카드를(항공편 포함) 빠짐없이 보내야 한다.

import type {
  ArrangeCardDetailViewModel,
  ArrangeCardGroup,
  ArrangeCardViewModel,
  ArrangeViewModel,
  DayColumnViewModel,
  ScheduledCardViewModel,
} from '@/types/arrange';
import type {
  PlaceCardAccent,
  PlaceCardBadgeSpec,
  PlaceCategory,
} from '@/types/grouping';

import type {
  DayViewModel,
  Groups04Response,
  PlacementSaveRequest,
} from '../types/arrange-api';
import type { Card, CardCategory, CardsResponse } from '../types/grouping-api';

/**
 * 화면 헤더/Day 보드에 필요한 여행 메타.
 * 1순위 출처는 GET /trips/{id}(옵션 A) 응답이며, 미로딩 시 온보딩 스토어로 폴백한다.
 */
export type TripMeta = {
  travelDays: number;
  destinations: string[];
  travelers: number;
  /** GET /trips/{id}.start_date(YYYY-MM-DD). 없으면 출국 항공편에서 파생. */
  startDate?: string | null;
};

const CATEGORY_MAP: Record<CardCategory, PlaceCategory> = {
  place: 'place',
  activity: 'activity',
  transport: 'transport',
  accommodation: 'lodging',
  food: 'food',
  etc: 'place',
};

const CLASSIFICATION_LABEL: Record<Card['classification'], string> = {
  confirmed: '확정됨',
  open_question: '질문있음',
  undecided: '미결정',
  unassigned: '미분류',
};

const PLACEMENT_LABEL: Record<string, string> = {
  ready: '배치 가능',
  ready_partial: '부분 준비',
  needs_input: '입력 필요',
  blocked: '확인 필요',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const parseDate = (iso: string | null | undefined): Date | null => {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
};

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const fmtDayLabel = (date: Date): string =>
  `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAYS[date.getDay()]})`;

const fmtShort = (date: Date): string =>
  `${date.getMonth() + 1}월 ${date.getDate()}일`;

const fmtTime = (iso: string | null | undefined): string | undefined => {
  const date = parseDate(iso);
  if (!date) return undefined;
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

// 분 → "N시간 M분". 확정 화면(Day 소요시간 합 등)에서도 재사용한다.
export const formatDuration = (minutes: number | null): string | undefined => {
  if (minutes === null || minutes < 0) return undefined;
  if (minutes === 0) return '0분';
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
};

const accentForCard = (card: Card): PlaceCardAccent => {
  if (card.is_excluded) return 'muted';
  switch (card.category) {
    case 'food':
      return 'amber';
    case 'accommodation':
      return 'blue';
    default:
      return 'green';
  }
};

export const buildBadges = (card: Card): PlaceCardBadgeSpec[] => {
  const badges: PlaceCardBadgeSpec[] = [
    { kind: 'category', category: CATEGORY_MAP[card.category] ?? 'place' },
  ];
  if (card.is_ai_generated) badges.push({ kind: 'ai' });
  return badges;
};

/**
 * 좌표(지도 위치)가 없어 동선 검증·자동 묶기(클러스터)에서 빠지는 드래그 가능 카드에 다는 표식.
 * 대표 사례: "카드 추가하기"로 직접 추가한 카드(백엔드가 좌표를 만들지 않음).
 */
const NEEDS_LOCATION_BADGE: PlaceCardBadgeSpec = {
  kind: 'status',
  label: '위치 확인 필요',
  tone: 'pending',
};

const placementLabel = (card: Card): string => {
  if (card.is_excluded) return '제외됨';
  return PLACEMENT_LABEL[card.placement_status] ?? card.placement_status;
};

const attentionLabel = (card: Card): string => {
  if (card.processing_status === 'failed') return '처리 실패';
  if (card.placement_status === 'needs_input') return '입력 필요';
  if (card.placement_status === 'blocked') return '확인 필요';
  return '처리 필요';
};

/**
 * "처리가 필요한 카드"(배치 불가)를 클릭했을 때 띄울 브라우저 알림(window.alert) 안내 문구.
 * 케이스 판별 순서는 백엔드 GroupService.getGroups04 의 unavailable 분기와 맞춘다.
 *  - failed: 처리 중 오류
 *  - needs_input: 정보 부족
 *  - blocked: 확인 필요
 *  - 그 외(ready/ready_partial 인데 좌표 없음 → geom null): 지도 위치를 못 찾음
 */
const attentionGuide = (card: Card): string => {
  const name = card.name?.trim() || '이 카드';
  if (card.processing_status === 'failed') {
    return `'${name}' 카드는 처리 중 문제가 생겨 일정에 배치할 수 없어요.\n\n아래에 장소명·주소 등 장소 정보를 다시 입력한 뒤 확인해 주세요.`;
  }
  if (card.placement_status === 'needs_input') {
    return `'${name}' 카드는 배치에 필요한 정보가 부족해요.\n\n아래에 빠진 장소명·주소를 입력한 뒤 확인해 주세요.`;
  }
  if (card.placement_status === 'blocked') {
    return `'${name}' 카드는 먼저 확인이 필요해요.\n\n카드 내용을 확인·정리한 뒤 다시 배치해 주세요.`;
  }
  // 좌표(지도 위치)가 없어 배치 불가인 케이스. placement_status 추론 대신
  // API 가 내려주는 coordinates 로 직접 판정한다(ready/ready_partial 모두 포함).
  if (card.coordinates == null) {
    return `'${name}' 카드는 지도 위치를 찾지 못해 일정에 배치할 수 없어요.\n\n아래에 장소명·주소를 더 정확히 입력한 뒤 확인해 주세요.`;
  }
  // 위 어느 사유에도 해당하지 않는 경우(정상 동작 시 도달하지 않음) — 일반 안내.
  return `'${name}' 카드는 아직 일정에 배치할 수 없어요.\n\n카드 상태를 확인해 주세요.`;
};

/**
 * BE canStartNaturalLanguageParsingFromNotes(PlaceCard.java:259-263) 미러링.
 * notes 보완 입력으로 카드 레벨 AI 재파싱(self-heal)을 트리거할 수 있는 카드인지 판정한다.
 *  - undecided && (needs_input | ready_partial)
 *  - failed && classification != open_question
 */
const canResolveByNotes = (card: Card): boolean =>
  (card.classification === 'undecided' &&
    (card.placement_status === 'needs_input' ||
      card.placement_status === 'ready_partial')) ||
  (card.processing_status === 'failed' &&
    card.classification !== 'open_question');

/**
 * 좌표(지도 위치)만 없을 뿐, 그 외에는 배치 가능한 카드인지 판정한다.
 * 백엔드 GroupService.getGroups04 의 버킷 순서를 그대로 미러링한다:
 * blocked/needs_input/failed 가 아니면서 geom 만 null 이라 unavailable 로 분류된 케이스.
 *
 * 기획상 위치/좌표 없음은 자동 묶기·동선 검증의 제약 사유일 뿐, 사용자가 Day 에
 * 직접 올려 확인하는 행위 자체를 막는 사유는 아니다. 이런 카드는 드래그 가능한
 * 스톡 카드("위치 확인 필요" 배지)로 노출한다. (needs_input 은 PRD 상 배치 불가이므로 제외)
 */
const isPlaceableDespiteMissingLocation = (card: Card): boolean =>
  card.coordinates == null &&
  card.placement_status !== 'needs_input' &&
  card.placement_status !== 'blocked' &&
  card.processing_status !== 'failed';

const flightLabel = (card: Card): string | undefined => {
  const date = parseDate(card.flight_datetime);
  const time = fmtTime(card.flight_datetime);
  if (!date || !time) return undefined;
  const suffix = card.flight_role === 'inbound' ? '출발' : '도착';
  return `${fmtShort(date)} ${time} ${suffix}`;
};

const detailDuration = (card: Card): string | undefined => {
  if (card.category === 'accommodation' && (card.check_in || card.check_out)) {
    const checkIn = card.check_in ?? '-';
    const checkOut = card.check_out ?? '-';
    return `체크인 ${checkIn} / 체크아웃 ${checkOut}`;
  }
  return formatDuration(card.estimated_duration_min);
};

const cardToDetail = (card: Card): ArrangeCardDetailViewModel => ({
  classification:
    CLASSIFICATION_LABEL[card.classification] ?? card.classification,
  placementStatus: placementLabel(card),
  fixedTimeLabel: flightLabel(card),
  region: card.location ?? undefined,
  durationLabel: detailDuration(card),
  userIntent: card.user_context ?? undefined,
  aiHint: card.tips ?? card.blocked_reason ?? undefined,
  memo: card.memo ?? '',
  notes: card.notes ?? '',
});

/** 좌측 목록의 배치 가능 카드(드래그 가능). add 응답 등에서도 재사용한다. */
export const cardToStockCard = (card: Card): ArrangeCardViewModel => {
  const badges = buildBadges(card);
  // 좌표가 없으면(직접 추가 카드 등) 동선 검증·자동 묶기에서 빠지므로 미리 표식을 단다.
  const missingLocation = card.coordinates == null;
  if (missingLocation) badges.push(NEEDS_LOCATION_BADGE);
  return {
    id: card.instance_id,
    name: card.name,
    accent: accentForCard(card),
    badges,
    draggable: true,
    // SCR-03 장소확인과 동일 규칙: BE가 notes 재파싱 가능한 카드에만 보완 입력을 연다.
    // (undecided+needs_input/ready_partial, 또는 failed. confirmed manual 카드는 제외)
    detail: {
      ...cardToDetail(card),
      canResolveByNotes: canResolveByNotes(card),
    },
  };
};

/** 좌측 목록의 "처리 필요 / 제외" 카드(드래그 불가, 클릭하면 사유 확인). */
const cardToAttentionCard = (
  card: Card,
  kind: 'unavailable' | 'excluded'
): ArrangeCardViewModel => {
  const statusBadge: PlaceCardBadgeSpec =
    kind === 'excluded'
      ? { kind: 'status', label: '제외', tone: 'fail' }
      : { kind: 'status', label: attentionLabel(card), tone: 'pending' };
  return {
    id: card.instance_id,
    name: card.name,
    accent: kind === 'excluded' ? 'muted' : 'red',
    badges: [...buildBadges(card), statusBadge],
    draggable: false,
    // 처리필요 카드만 notes 재파싱(self-heal) 가능 플래그를 채운다. 제외 카드는 해결 대상이 아니다.
    detail:
      kind === 'unavailable'
        ? { ...cardToDetail(card), canResolveByNotes: canResolveByNotes(card) }
        : cardToDetail(card),
    // 제외 카드는 의도적으로 뺀 항목이므로 안내하지 않는다.
    actionGuide: kind === 'unavailable' ? attentionGuide(card) : undefined,
  };
};

/** 우측 Day 보드에 올라가는 일정 카드. 항공편은 fixedTime(고정 시작 시간) 카드로 렌더. */
const cardToScheduled = (card: Card): ScheduledCardViewModel => ({
  id: card.instance_id,
  name: card.name,
  accent: accentForCard(card),
  badges: buildBadges(card),
  fixedTime: card.flight_role ? fmtTime(card.flight_datetime) : undefined,
});

const deriveStartDate = (cards: Card[]): Date | null => {
  const outbound = cards.find(
    (c) => c.flight_role === 'outbound' && c.flight_datetime
  );
  if (!outbound) return null;
  const dt = parseDate(outbound.flight_datetime);
  if (!dt) return null;
  // outbound 가 day N 에 있다면 day 1 날짜는 그만큼 앞선다.
  return addDays(dt, -((outbound.day ?? 1) - 1));
};

/** 옵션 A: trip 상세 start_date 우선, 없으면(온보딩 미전송) 출국 항공편에서 파생. */
export const resolveStartDate = (meta: TripMeta, cards: Card[]): Date | null =>
  parseDate(meta.startDate) ?? deriveStartDate(cards);

/** 시작일 Date + 여행 일수 → "5월 10일 ~ 5월 14일". 시작일이 없으면 null. */
export const formatTripDateRange = (
  startDate: Date | null,
  travelDays: number
): string | null => {
  if (!startDate || travelDays <= 0) return null;
  return `${fmtShort(startDate)} ~ ${fmtShort(addDays(startDate, travelDays - 1))}`;
};

/**
 * 백엔드 DayViewModel(GET /days/{n}) 한 건 → Day 컬럼.
 * 카드 순서/항공편 분리는 서버(DayViewService)가 이미 끝냈으므로 FE 는 재정렬하지 않고
 * start_time_card(출국) → cards(나머지, createdAt 순) → end_time_card(귀국) 으로 펼치기만 한다.
 */
const dayViewModelToColumn = (
  dvm: DayViewModel,
  dayNumber: number,
  startDate: Date | null
): DayColumnViewModel => {
  const ordered: Card[] = [
    ...(dvm.start_time_card ? [dvm.start_time_card] : []),
    ...dvm.cards,
    ...(dvm.end_time_card ? [dvm.end_time_card] : []),
  ];
  return {
    id: `day-${dayNumber}`,
    dayLabel: `Day ${dayNumber}`,
    dateLabel: startDate ? fmtDayLabel(addDays(startDate, dayNumber - 1)) : '',
    cards: ordered.map(cardToScheduled),
  };
};

/**
 * 우측 Day 보드 = 백엔드 GET /days/{n} 결과(day 1..N 순서)를 그대로 컬럼으로 펼친 것.
 * 좌측 stock(mapToArrangeViewModel)과 출처가 달라 함수를 분리한다.
 */
export const mapDayColumns = (
  dayViewModels: DayViewModel[],
  meta: TripMeta,
  cardsRes: CardsResponse
): DayColumnViewModel[] => {
  const startDate = resolveStartDate(meta, cardsRes.cards);
  return dayViewModels.map((dvm, index) =>
    dayViewModelToColumn(dvm, index + 1, startDate)
  );
};

export const mapToArrangeViewModel = (
  groups04: Groups04Response,
  cardsRes: CardsResponse,
  meta: TripMeta
): ArrangeViewModel => {
  const isUnplaced = (card: Card) => card.day == null;

  // --- 좌측 카드 목록 ---
  const groups: ArrangeCardGroup[] = [];

  for (const stock of groups04.available) {
    const cards = stock.cards.filter(isUnplaced).map(cardToStockCard);
    if (cards.length === 0) continue;
    groups.push({
      id: `stock-${stock.label}`,
      title: stock.label,
      description: stock.group_reason ?? undefined,
      cards,
    });
  }

  const reorder = groups04.pending_reorder
    .filter(isUnplaced)
    .map(cardToStockCard);
  if (reorder.length > 0) {
    groups.push({
      id: 'pending-reorder',
      title: '재정렬이 필요한 카드',
      description: '위치 정보가 바뀌어 다시 배치하면 좋아요.',
      cards: reorder,
    });
  }

  // 백엔드 unavailable 은 (a) 좌표만 없는 배치 가능 카드와 (b) 입력·확인이 필요한
  // 진짜 처리 필요 카드가 섞여 있다. (a)는 드래그 가능한 스톡 카드로, (b)는 기존대로
  // 드래그 불가 안내 카드로 분리한다.
  const unavailableCards = groups04.unavailable.filter(isUnplaced);

  const placeableNoLocation = unavailableCards
    .filter(isPlaceableDespiteMissingLocation)
    .map(cardToStockCard);
  if (placeableNoLocation.length > 0) {
    groups.push({
      id: 'needs-location',
      title: '위치 확인이 필요한 카드',
      description: '지도 위치만 아직 없어요. 직접 Day에 올려 확인할 수 있어요.',
      cards: placeableNoLocation,
    });
  }

  const unavailable = unavailableCards
    .filter((card) => !isPlaceableDespiteMissingLocation(card))
    .map((card) => cardToAttentionCard(card, 'unavailable'));
  if (unavailable.length > 0) {
    groups.push({
      id: 'unavailable',
      title: '처리가 필요한 카드',
      description: '입력·확인이 끝나면 배치할 수 있어요.',
      cards: unavailable,
    });
  }

  const excluded = groups04.excluded
    .filter(isUnplaced)
    .map((card) => cardToAttentionCard(card, 'excluded'));
  if (excluded.length > 0) {
    groups.push({
      id: 'excluded',
      title: '제외된 카드',
      description: '여행 일정에서 제외한 항목이에요.',
      cards: excluded,
    });
  }

  // 우측 Day 보드는 mapDayColumns(GET /days/{n}) 로 별도 구성한다. 여기선 헤더용 날짜만.
  const dayCount = meta.travelDays;
  const startDate = resolveStartDate(meta, cardsRes.cards);

  // --- 헤더 summary / 헤딩 ---
  const fallbackDestination =
    cardsRes.cards.find((c) => c.location)?.location ?? '여행';
  const destination = meta.destinations[0] ?? fallbackDestination;
  const dateRange =
    startDate && dayCount > 0
      ? `${fmtShort(startDate)} ~ ${fmtShort(addDays(startDate, dayCount - 1))}`
      : '-';

  return {
    summary: {
      destination,
      extraDestinations: Math.max(meta.destinations.length - 1, 0),
      travelers: meta.travelers,
      dateRange,
    },
    heading: {
      title: '일정 배치',
      subtitle:
        cardsRes.context_summary ??
        '배치 가능한 카드를 Day별로 끌어다 놓아 일정을 완성하세요.',
    },
    cardListTitle: '카드 목록',
    groups,
  };
};

/**
 * 우측 Day 보드의 현재 상태 → verify/confirm 요청 스냅샷.
 * 비어 있는 Day 는 제외하고, 각 카드의 예상 소요 시간은 instance_id 로 조회한다.
 */
export const buildPlacementRequest = (
  days: DayColumnViewModel[],
  durationByInstance: Record<string, number | null>
): PlacementSaveRequest => ({
  days: days
    .map((day, index) => ({
      day_number: index + 1,
      cards: day.cards.map((card, order) => ({
        instance_id: card.id,
        order: order + 1,
        estimated_duration_min: durationByInstance[card.id] ?? undefined,
      })),
    }))
    .filter((day) => day.cards.length > 0),
});
