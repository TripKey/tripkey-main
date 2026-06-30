import type {
  AddCardCategory,
  AddCardDraft,
} from '@/components/grouping/AddCardModal';
import type {
  ActionGroup,
  GroupingViewModel,
  PlaceCardAccent,
  PlaceCardBadgeSpec,
  PlaceCardViewModel,
  PlaceCategory,
  TripSummaryViewModel,
} from '@/types/grouping';

import type {
  Card,
  CardCategory,
  Groups03Response,
} from '../types/grouping-api';
import type { CardAddRequest } from '../types/grouping-api';
import type { TripDetailResponse } from '../types/trip-api';

import { tripDateRangeLabel } from './trip-meta';

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

const formatDuration = (minutes: number | null): string | undefined => {
  if (minutes === null || minutes < 0) return undefined;
  if (minutes === 0) return '0분';
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}시간` : `${hours}시간 ${rest}분`;
};

const buildBadges = (
  card: Card,
  variant: 'select' | 'edit' | 'review' | 'unassigned'
): PlaceCardBadgeSpec[] => {
  const badges: PlaceCardBadgeSpec[] = [];
  const category = CATEGORY_MAP[card.category] ?? 'place';
  badges.push({ kind: 'category', category });

  if (variant === 'edit') {
    badges.push({ kind: 'status', label: '실패', tone: 'fail' });
  }
  if (card.is_ai_generated) {
    badges.push({ kind: 'ai' });
  }
  return badges;
};

const accentFor = (
  variant: 'select' | 'edit' | 'review' | 'unassigned'
): PlaceCardAccent => {
  switch (variant) {
    case 'review':
      return 'green';
    case 'select':
      return 'blue';
    case 'edit':
      return 'red';
    case 'unassigned':
    default:
      return 'muted';
  }
};

const reminderFor = (card: Card): string | undefined =>
  card.tips ?? card.blocked_reason ?? undefined;

const toReviewCard = (card: Card): PlaceCardViewModel => ({
  id: card.instance_id,
  name: card.name,
  region: card.location ?? undefined,
  durationLabel: formatDuration(card.estimated_duration_min),
  processing: card.processing_status === 'processing',
  accent: accentFor('review'),
  badges: buildBadges(card, 'review'),
  reminder: reminderFor(card),
  detail: {
    classification:
      CLASSIFICATION_LABEL[card.classification] ?? card.classification,
    placementStatus: card.placement_status,
    userIntent: card.user_context ?? undefined,
    aiHint: card.tips ?? undefined,
    memo: card.memo ?? '',
    includedInItinerary: !card.is_excluded,
  },
});

const toSelectCard = (card: Card): PlaceCardViewModel => ({
  id: card.instance_id,
  name: card.name,
  region: card.location ?? undefined,
  durationLabel: formatDuration(card.estimated_duration_min),
  processing: card.processing_status === 'processing',
  accent: accentFor('select'),
  badges: buildBadges(card, 'select'),
  reminder: reminderFor(card),
  selectDetail: {
    classification:
      CLASSIFICATION_LABEL[card.classification] ?? card.classification,
    placementStatus: card.placement_status,
    userIntent: card.user_context ?? undefined,
    aiHint: card.tips ?? undefined,
    question: card.question_text ?? '추가 정보가 필요해요',
    choices: card.options ?? [],
    selectedChoices: [],
    answer: '',
    memo: card.memo ?? '',
    includedInItinerary: !card.is_excluded,
  },
});

const canResolveByNotesCheck = (card: Card): boolean =>
  (card.classification === 'undecided' &&
    (card.placement_status === 'needs_input' ||
      card.placement_status === 'ready_partial')) ||
  (card.processing_status === 'failed' &&
    card.classification !== 'open_question');

const toEditCard = (card: Card): PlaceCardViewModel => {
  const resolvable = canResolveByNotesCheck(card);
  const isStructuredCategory =
    card.category === 'accommodation' || card.category === 'transport';
  return {
    id: card.instance_id,
    name: card.name,
    region: card.location ?? undefined,
    durationLabel: formatDuration(card.estimated_duration_min),
    processing: card.processing_status === 'processing',
    accent: accentFor('edit'),
    badges: buildBadges(card, 'edit'),
    reminder: reminderFor(card),
    editDetail: {
      classification:
        CLASSIFICATION_LABEL[card.classification] ?? card.classification,
      placementStatus: card.placement_status,
      userIntent: card.user_context ?? undefined,
      aiHint: card.tips ?? undefined,
      reason: card.blocked_reason ?? '처리에 실패했어요',
      retryNotice: '아래에 올바른 정보를 입력해주시면 다시 처리를 시도합니다',
      question: card.question_text ?? '정확한 정보를 입력해주세요',
      answer: '',
      memo: card.memo ?? '',
      notes: card.notes ?? '',
      structuredFields: isStructuredCategory
        ? {
            location: card.location ?? undefined,
            checkIn: card.check_in ?? undefined,
            checkOut: card.check_out ?? undefined,
            timeConstraint: card.time_constraint ?? undefined,
            flightNumber: card.flight_number ?? undefined,
          }
        : undefined,
      structuredEditCategory: isStructuredCategory
        ? (card.category as 'accommodation' | 'transport')
        : undefined,
      canResolveByStructuredEdit: isStructuredCategory,
      canResolveByNotes: resolvable,
      canSelectProcess: resolvable && !!(card.location ?? card.name),
      selectProcessNotes: card.location ?? card.name ?? undefined,
    },
  };
};

const toUnassignedCard = (card: Card): PlaceCardViewModel => ({
  id: card.instance_id,
  name: card.name,
  region: card.location ?? undefined,
  durationLabel: formatDuration(card.estimated_duration_min),
  processing: card.processing_status === 'processing',
  accent: accentFor('unassigned'),
  badges: buildBadges(card, 'unassigned'),
  reminder:
    card.blocked_reason ??
    card.tips ??
    '여행 일정에서 제외한 항목이에요. 눌러서 다시 포함할 수 있어요.',
  actionLabel: card.blocked_reason ? '수정하기' : undefined,
  detail: {
    classification:
      CLASSIFICATION_LABEL[card.classification] ?? card.classification,
    placementStatus: card.placement_status,
    userIntent: card.user_context ?? undefined,
    aiHint: card.tips ?? undefined,
    memo: card.memo ?? '',
    includedInItinerary: false,
  },
});

const countLabel = (
  variant: 'select' | 'edit' | 'review' | 'unassigned',
  count: number
): string => {
  switch (variant) {
    case 'select':
      return `${count}개의 카드가 선택이 필요해요`;
    case 'edit':
      return `${count}개의 카드가 수정이 필요해요`;
    case 'review':
      return `${count}개의 카드가 검토만 남았어요`;
    case 'unassigned':
    default:
      return `${count}개의 카드가 일정에 포함되지 않았어요`;
  }
};

export const mapToGroupingViewModel = (
  groups: Groups03Response,
  options?: {
    contextSummary?: string | null;
    /** GET /trips/{id} 응답. 있으면 여행지/일수/인원/기간을 여기서 채운다. */
    trip?: TripDetailResponse | null;
  }
): GroupingViewModel => {
  const selectCards = [
    ...groups.input_required.map(toSelectCard),
    ...groups.select_required.map(toSelectCard),
  ];
  const editCards = groups.fix_required.map(toEditCard);
  const reviewCards = groups.review_only.map(toReviewCard);
  const unassignedCards = groups.excluded.map(toUnassignedCard);

  const inputCount =
    groups.input_required.length + groups.select_required.length;
  const editCount = groups.fix_required.length;
  const doneCount = reviewCards.length;
  const excludedCount = unassignedCards.length;
  const activeCount = inputCount + editCount + doneCount;
  const percent =
    activeCount === 0 ? 0 : Math.round((doneCount / activeCount) * 100);

  const actionGroups: ActionGroup[] = [
    {
      variant: 'select',
      title: '선택이 필요한 카드들',
      countLabel: countLabel('select', selectCards.length),
      defaultOpen: true,
      cards: selectCards,
    },
    {
      variant: 'edit',
      title: '수정이 필요한 카드들',
      countLabel: countLabel('edit', editCards.length),
      defaultOpen: true,
      cards: editCards,
    },
    {
      variant: 'review',
      title: '확인만 하면 되는 카드들',
      countLabel: countLabel('review', reviewCards.length),
      defaultOpen: true,
      cards: reviewCards,
    },
    {
      variant: 'unassigned',
      title: '제외된 카드들',
      countLabel: countLabel('unassigned', unassignedCards.length),
      defaultOpen: true,
      cards: unassignedCards,
    },
  ].filter((group) => group.cards.length > 0) as ActionGroup[];

  const totalCards = activeCount + excludedCount;

  const trip = options?.trip;

  // 여행지: trip 상세가 있으면 그대로, 없으면 카드 location 으로 임시 추출(폴백).
  const destinations = trip
    ? trip.destinations
    : (() => {
        const set = new Set<string>();
        for (const card of [
          ...selectCards,
          ...editCards,
          ...reviewCards,
          ...unassignedCards,
        ]) {
          if (card.region) set.add(card.region);
        }
        return Array.from(set);
      })();

  const summary: TripSummaryViewModel = {
    destinations,
    dateRange: trip
      ? tripDateRangeLabel(trip.start_date, trip.travel_days)
      : '-',
    nights: trip ? Math.max(trip.travel_days - 1, 0) : 0,
    days: trip?.travel_days ?? 0,
    travelers: trip?.companion_count ?? 0,
    totalCards,
    cardStats: [
      { label: '입력', count: inputCount, tone: 'select' },
      { label: '수정', count: editCount, tone: 'edit' },
      { label: '완료', count: doneCount, tone: 'done' },
      { label: '제외', count: excludedCount, tone: 'neutral' },
    ],
    completionPct: percent,
  };

  return {
    heading: {
      title: '정보 정리하기',
      subtitle:
        options?.contextSummary ??
        '카드별로 확인/수정/선택을 진행해 일정을 정리하세요',
    },
    progress: { percent, activeCount, doneCount },
    groups: actionGroups,
    summary,
  };
};

// excluded 우선, 그 외에는 action_type 그대로 버킷 선택.
const classifyCard = (
  card: Card
):
  | 'input_required'
  | 'select_required'
  | 'fix_required'
  | 'review_only'
  | 'excluded' => {
  if (card.is_excluded) return 'excluded';
  return card.action_type;
};

// 업데이트된 카드(patch/add 응답)를 모든 버킷에서 제거 후 분류된 버킷에 삽입.
// 버킷이 바뀌어도(예: 제외 처리 → 'excluded') 일관되게 반영된다.
export const upsertCardIntoGroups = (
  groups: Groups03Response,
  card: Card
): Groups03Response => {
  const filtered: Groups03Response = {
    view: '03',
    input_required: groups.input_required.filter(
      (c) => c.instance_id !== card.instance_id
    ),
    select_required: groups.select_required.filter(
      (c) => c.instance_id !== card.instance_id
    ),
    fix_required: groups.fix_required.filter(
      (c) => c.instance_id !== card.instance_id
    ),
    review_only: groups.review_only.filter(
      (c) => c.instance_id !== card.instance_id
    ),
    excluded: groups.excluded.filter((c) => c.instance_id !== card.instance_id),
  };
  const bucket = classifyCard(card);
  return { ...filtered, [bucket]: [...filtered[bucket], card] };
};

const ADD_CATEGORY_MAP: Record<AddCardCategory, CardCategory> = {
  place: 'place',
  activity: 'activity',
  flight: 'transport',
  lodging: 'accommodation',
  food: 'food',
  etc: 'etc',
};

export const toCardAddRequest = (draft: AddCardDraft): CardAddRequest => ({
  name: draft.name.trim(),
  category: ADD_CATEGORY_MAP[draft.category],
  location: draft.region.trim() || undefined,
  estimated_duration_min:
    Number.isFinite(draft.durationMin) && draft.durationMin > 0
      ? draft.durationMin
      : undefined,
  time_constraint: draft.timeMemo.trim() || undefined,
  memo: draft.memo.trim() || undefined,
});
