// 백엔드 응답(GET /trips·/cards·/days) → 확정 화면(SCR-05) ConfirmViewModel 변환.
//
// 데이터 출처 원칙:
//  - 여행 메타(여행지·인원·일수): GET /trips/{id} 1순위, 미로딩 시 온보딩 스토어 폴백(배치 화면과 동일).
//  - dateRange: 서버 start_date → 출국 항공편 파생(resolveStartDate) → calendar store 라벨 → '기간 미정'.
//  - Day 카드/소요시간/항공편 분리: 서버 GET /days/{n}(DayViewService)가 SSOT — FE 는 재현하지 않는다.
//  - Day 제목: BE 내러티브(narrative) 미구현이라 카드 기반 라벨로 합성, summary 문장은 생략.
//  - 카드 시각 라벨·히어로 stats·이동시간(totalMove): BE 미구현/미연동 → 생략·숨김·'-' 폴백.
//  - alert: scope!=='day' 는 좌측 Alert Cards, scope==='day' 는 해당 Day 체크리스트(#188 머지 후 채워짐).

import type { OnboardingRequest } from '@/types/onboarding';

import type { DayViewModel, RouteLeg } from '../types/arrange-api';
import type {
  ConfirmAlertCard,
  ConfirmCardViewModel,
  ConfirmChecklistItem,
  ConfirmDayViewModel,
  ConfirmViewModel,
} from '../types/confirm';
import type { AlertCard, Card, CardsResponse } from '../types/grouping-api';
import type { TripDetailResponse } from '../types/trip-api';

import {
  buildBadges,
  formatDuration,
  formatTripDateRange,
  resolveStartDate,
  type TripMeta,
} from './arrange-mapper';
import { tripDurationLabel } from './trip-meta';

/**
 * 여행 전반 체크리스트(출국 전 실무 항목). BE 컨트랙트가 없는 FE 고정 목록이며
 * 토글 상태는 추후 localStorage 로 영속한다(현재는 매 진입 초기화).
 */
const DEFAULT_TRIP_CHECKLIST: ConfirmChecklistItem[] = [
  { id: 'passport', label: '여권 유효기간 확인', done: false },
  { id: 'flight', label: '항공권 출력 / 모바일 저장', done: false },
  { id: 'voucher', label: '숙소 바우처 준비', done: false },
  { id: 'insurance', label: '여행자 보험 가입', done: false },
  { id: 'pass', label: '교통패스 예약', done: false },
  { id: 'fx', label: '환전', done: false },
];

type ConfirmMapperInput = {
  detail: TripDetailResponse | undefined;
  cardsRes: CardsResponse | undefined;
  dayViewModels: (DayViewModel | undefined)[];
  routeLegs: RouteLeg[];
  /** 온보딩 스토어 form — 메타 폴백 + 여행 이름(tripName) 출처. */
  form: OnboardingRequest;
  /** calendar store 라벨(formatDateRangeLabel) — 서버/항공편으로 날짜를 못 구할 때 폴백. */
  dateRangeFallback: string;
};

const resolveMeta = (
  detail: TripDetailResponse | undefined,
  form: OnboardingRequest
): TripMeta => ({
  travelDays: detail?.travel_days ?? form.travel_days,
  destinations: detail?.destinations ?? form.destinations,
  travelers: detail?.companion_count ?? form.companion_count,
  startDate: detail?.start_date ?? null,
});

/** 서버 start_date → 출국편 파생 → calendar store → '기간 미정'. */
const resolveDateRange = (
  meta: TripMeta,
  cards: Card[],
  fallback: string
): string => {
  const startDate = resolveStartDate(meta, cards);
  return (
    formatTripDateRange(startDate, meta.travelDays) ?? (fallback || '기간 미정')
  );
};

/** Day 한 칸을 펼친 순서: 출국편 → 일반 카드(서버 정렬) → 귀국편. */
const orderDayCards = (dvm: DayViewModel): Card[] => [
  ...(dvm.start_time_card ? [dvm.start_time_card] : []),
  ...dvm.cards,
  ...(dvm.end_time_card ? [dvm.end_time_card] : []),
];

const cardToConfirmCard = (
  card: Card,
  order: number
): ConfirmCardViewModel => ({
  id: card.instance_id,
  order,
  name: card.name,
  badges: buildBadges(card),
  // 시각 라벨(timeLabel)은 BE 타임라인 엔진 미구현 → 생략, 번호 순서만 노출.
  region: card.location ?? undefined,
  userNote: card.user_context ?? undefined,
  aiTip: card.tips ?? undefined,
  coordinates: card.coordinates ?? undefined,
  category: card.category,
});

// BE 내러티브(narrative) 부재 → 카드 수 기반으로 "Day N · M곳" 합성.
// card.location 은 도시/지역이 아니라 전체 주소라 제목에 쓰면 지저분 → 대표지역 라벨은 쓰지 않는다.
// (깨끗한 per-day 지역명은 BE 의 city/region 필드가 생기면 교체.)
const synthesizeDayTitle = (dayNumber: number, cards: Card[]): string => {
  if (cards.length === 0) return `Day ${dayNumber}`;
  return `Day ${dayNumber} · ${cards.length}곳`;
};

const sumDuration = (cards: Card[]): number =>
  cards.reduce((acc, c) => acc + (c.estimated_duration_min ?? 0), 0);

const alertToConfirmAlert = (alert: AlertCard): ConfirmAlertCard => {
  const isInsight = alert.category === 'insight';
  return {
    id: alert.id,
    kind: isInsight ? 'AI 인사이트' : '실무 알림',
    category: isInsight ? 'insight' : 'practical',
    body: alert.day ? `Day ${alert.day} · ${alert.message}` : alert.message,
  };
};

const buildDay = (
  dayNumber: number,
  dvm: DayViewModel | undefined,
  routeLegs: RouteLeg[]
): ConfirmDayViewModel => {
  const cards = dvm ? orderDayCards(dvm) : [];
  const moveSeconds = routeLegs
    .filter((leg) => leg.day === dayNumber && leg.duration_seconds != null)
    .reduce((sum, leg) => sum + (leg.duration_seconds ?? 0), 0);
  const moveMinutes = Math.ceil(moveSeconds / 60);
  return {
    id: `day-${dayNumber}`,
    dayLabel: `Day ${dayNumber}`,
    title: synthesizeDayTitle(dayNumber, cards),
    // Day 요약 문장(narrative)은 BE 미구현 → 생략.
    summary: '',
    // 이동시간은 confirm 응답 route_legs(#187) 연동 전까지 '-' 폴백.
    totalMove: moveSeconds > 0 ? formatDuration(moveMinutes) ?? '-' : '-',
    totalSpend: formatDuration(sumDuration(cards) + moveMinutes) ?? '-',
    contextCards: cards.map((card, idx) => cardToConfirmCard(card, idx + 1)),
    dayChecklist: [],
  };
};

export const mapToConfirmViewModel = ({
  detail,
  cardsRes,
  dayViewModels,
  routeLegs,
  form,
  dateRangeFallback,
}: ConfirmMapperInput): ConfirmViewModel => {
  const meta = resolveMeta(detail, form);
  const cards = cardsRes?.cards ?? [];
  const alerts = cardsRes?.alert_cards ?? [];

  const fallbackDestination = cards.find((c) => c.location)?.location ?? '여행';
  const destination = meta.destinations[0] ?? fallbackDestination;
  const title =
    form.tripName?.trim() ||
    (meta.destinations[0] ? `${meta.destinations[0]} 여행` : '여행 일정');

  const days: ConfirmDayViewModel[] = Array.from(
    { length: Math.max(meta.travelDays, 0) },
    (_, i) => buildDay(i + 1, dayViewModels[i], routeLegs)
  );

  return {
    summary: {
      destination,
      extraDestinations: Math.max(meta.destinations.length - 1, 0),
      travelers: meta.travelers,
      dateRange: resolveDateRange(meta, cards, dateRangeFallback),
    },
    hero: {
      title,
      destinations: meta.destinations,
      travelers: meta.travelers,
      durationLabel: tripDurationLabel(meta.travelDays),
      // 여행 성향 stats 4종은 BE 미구현 → 빈 배열(히어로에서 숨김).
      stats: [],
    },
    tripChecklist: DEFAULT_TRIP_CHECKLIST,
    // Day 체크리스트를 제거했으므로 문제성 Day alert도 좌측 Alert Cards에 함께 노출한다.
    alertCards: alerts.map(alertToConfirmAlert),
    days,
  };
};
