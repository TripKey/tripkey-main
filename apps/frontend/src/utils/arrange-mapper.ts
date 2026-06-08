// 백엔드 응답(Groups04Response / CardsResponse) → 배치 화면 ViewModel 변환과
// 배치 저장(verify/confirm) 요청 payload 구성을 담당한다.
//
// 화면 분할 규칙:
//  - 좌측 "카드 목록"  = 아직 배치되지 않은(day == null) 카드. Groups04 의 클러스터 라벨을 그대로 쓴다.
//  - 우측 Day 보드     = 배치된(day != null) 카드. CardsResponse 에서 day 별로 묶는다.
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

import type { PlacementSaveRequest } from '../types/arrange-api';
import type { Groups04Response } from '../types/arrange-api';
import type { Card, CardCategory, CardsResponse } from '../types/grouping-api';

/** 온보딩 단계에서만 알 수 있는 여행 메타(백엔드 trip 상세 API 부재). */
export type TripMeta = {
  travelDays: number;
  destinations: string[];
  travelers: number;
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

const formatDuration = (minutes: number | null): string | undefined => {
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

const buildBadges = (card: Card): PlaceCardBadgeSpec[] => {
  const badges: PlaceCardBadgeSpec[] = [
    { kind: 'category', category: CATEGORY_MAP[card.category] ?? 'place' },
  ];
  if (card.is_ai_generated) badges.push({ kind: 'ai' });
  return badges;
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
});

/** 좌측 목록의 배치 가능 카드(드래그 가능). add 응답 등에서도 재사용한다. */
export const cardToStockCard = (card: Card): ArrangeCardViewModel => ({
  id: card.instance_id,
  name: card.name,
  accent: accentForCard(card),
  badges: buildBadges(card),
  draggable: true,
  detail: cardToDetail(card),
});

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
    detail: cardToDetail(card),
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

// 항공편(출국=맨 위, 귀국=맨 아래) + 나머지는 day_order 순.
const orderDayCards = (cards: Card[]): Card[] => {
  const outbound = cards.filter((c) => c.flight_role === 'outbound');
  const inbound = cards.filter((c) => c.flight_role === 'inbound');
  const middle = cards
    .filter((c) => c.flight_role !== 'outbound' && c.flight_role !== 'inbound')
    .sort((a, b) => (a.day_order ?? Infinity) - (b.day_order ?? Infinity));
  return [...outbound, ...middle, ...inbound];
};

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

  const unavailable = groups04.unavailable
    .filter(isUnplaced)
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

  // --- 우측 Day 보드 ---
  const placed = cardsRes.cards.filter((c) => c.day != null);
  const maxPlacedDay = placed.reduce((max, c) => Math.max(max, c.day ?? 0), 0);
  const dayCount = Math.max(meta.travelDays || 0, maxPlacedDay);
  const startDate = deriveStartDate(cardsRes.cards);

  const days: DayColumnViewModel[] = [];
  for (let n = 1; n <= dayCount; n += 1) {
    const dayCards = orderDayCards(placed.filter((c) => c.day === n));
    days.push({
      id: `day-${n}`,
      dayLabel: `Day ${n}`,
      dateLabel: startDate ? fmtDayLabel(addDays(startDate, n - 1)) : '',
      cards: dayCards.map(cardToScheduled),
    });
  }

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
    days,
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
