// ArrangePage (SCR-04 배치 '일정 배치' 페이지)
// 좌측 "카드 목록"(그룹별) + 우측 Day 칸반 보드 + 하단 푸터.
//
// 데이터 흐름:
//  - GET /groups?view=04  → 좌측 배치 가능 스톡(클러스터) + 처리 필요 + 제외
//  - GET /cards           → 우측 Day 보드(배치된 카드) + 예상 소요 시간 조회
//  - 드래그앤드롭은 로컬 상태로만 반영하고,
//  - "동선 검증하기" = POST /verify, "일정 확정하기" = POST /confirm 로 전체 배치 스냅샷을 전송한다.
//    (백엔드에 카드별 day 저장 API 가 없어 스냅샷 일괄 전송만 가능)

import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Plus, Sparkles } from 'lucide-react';
import posthog from 'posthog-js';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CardListPanel from '@/components/arrange/CardListPanel';
import DayColumn from '@/components/arrange/DayColumn';
import CardAddFlow from '@/components/card-add/CardAddFlow';
import CardDetailPanel from '@/components/card-detail/CardDetailPanel';
import { PAGE_ENTER } from '@/components/common/PageTransition';
import Header from '@/components/header/Header';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useAddCardMutation,
  useArrangeCardsQuery,
  useConfirmPlacementMutation,
  useDaysQuery,
  useDuplicateCardMutation,
  useGroups04Query,
  usePatchCardMutation,
  useReorderGroupsMutation,
  useSuggestedItineraryMutation,
} from '@/hooks/useArrange';
import { useTripDetailQuery } from '@/hooks/useTripDetail';
import { cn } from '@/lib/utils';
import type {
  ArrangeCardGroup,
  ArrangeCardViewModel,
  DayColumnViewModel,
  ScheduledCardViewModel,
} from '@/types/arrange';
import type {
  RouteWarning,
  SuggestedItineraryRequest,
} from '@/types/arrange-api';
import type { Card, CardPatchRequest } from '@/types/grouping-api';
import type { ArrangeDragPayload } from '@/utils/arrange-dnd';

import { fetchGroups04 } from '../utils/arrange-api';
import {
  buildPlacementRequest,
  cardToStockCard,
  mapDayColumns,
  mapToArrangeViewModel,
} from '../utils/arrange-mapper';
import type { TripMeta } from '../utils/arrange-mapper';
import {
  useCalendarStore,
  formatDateRangeLabel,
} from '../utils/calendar-store';
import { fetchCards, parseGroupingApiError } from '../utils/grouping-api';
import { toCardAddRequest } from '../utils/grouping-mapper';
import { useOnboardingStore } from '../utils/onboarding-store';

// 직접 추가한 카드가 모이는 좌측 그룹(첫 추가 시 생성).
const ADDED_GROUP_ID = 'added';

// 처리필요 카드 해결(재파싱) 후 processing 이 풀릴 때까지의 폴링 주기/타임아웃.
// 정리 화면(GroupingPage)의 pollUntilCardSettled 와 동일한 값.
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

const buildSelectionNotes = ({
  cardName,
  selectedText,
  destinations,
  region,
  userIntent,
}: {
  cardName: string;
  selectedText: string;
  destinations: string[];
  region?: string;
  userIntent?: string;
}) => {
  const selectedCandidate = selectedText.trim() || cardName;
  return [
    `사용자가 선택한 후보: ${selectedCandidate}`,
    `기존 카드명: ${cardName}`,
    destinations.length > 0 ? `여행지: ${destinations.join(', ')}` : null,
    region ? `지역 힌트: ${region}` : null,
    userIntent ? `기존 요청: ${userIntent}` : null,
  ]
    .filter(Boolean)
    .join('\n');
};

// 좌측 목록 카드 → Day 보드에 배치되는 일정 카드로 변환(로컬 드래그앤드롭용).
const toScheduledCard = (
  card: ArrangeCardViewModel
): ScheduledCardViewModel => ({
  id: card.id,
  name: card.name,
  accent: card.accent,
  badges: card.badges,
  detail: card.detail,
  processing: card.processing,
});

// index 위치에 item 삽입(미지정·범위 초과 시 맨 뒤).
const insertAt = <T,>(arr: T[], item: T, index?: number): T[] => {
  if (index == null || index >= arr.length) return [...arr, item];
  const i = Math.max(0, index);
  return [...arr.slice(0, i), item, ...arr.slice(i)];
};

const errorMessageOf = (error: unknown, fallback: string): string => {
  const apiBody = parseGroupingApiError(error);
  if (apiBody?.message) return apiBody.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

const toArrangeCardFromScheduled = (
  card: ScheduledCardViewModel
): ArrangeCardViewModel => ({
  id: card.id,
  name: card.name,
  accent: card.accent,
  badges: card.badges,
  draggable: !card.fixedTime,
  detail: card.detail,
  processing: card.processing,
});

const toUpdatedScheduledCard = (
  card: Card,
  previous: ScheduledCardViewModel
): ScheduledCardViewModel => ({
  ...toScheduledCard(cardToStockCard(card)),
  fixedTime: previous.fixedTime,
});

const ArrangePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const urlTripId = searchParams.get('tripId');
  const storeTripId = useOnboardingStore((s) => s.tripId);
  const setStoreTripId = useOnboardingStore((s) => s.actions.setTripId);
  const form = useOnboardingStore((s) => s.form);
  const { type: calendarType, exactDate, flexDate } = useCalendarStore();
  const tripId: string | null = urlTripId ?? storeTripId;

  useEffect(() => {
    if (urlTripId && urlTripId !== storeTripId) setStoreTripId(urlTripId);
  }, [urlTripId, storeTripId, setStoreTripId]);

  const groups04Query = useGroups04Query(tripId);
  const cardsQuery = useArrangeCardsQuery(tripId);
  const tripDetailQuery = useTripDetailQuery(tripId);

  const patchCardMutation = usePatchCardMutation(tripId);
  const addCardMutation = useAddCardMutation(tripId);
  const duplicateCardMutation = useDuplicateCardMutation(tripId);
  const reorderMutation = useReorderGroupsMutation(tripId);
  const suggestedItineraryMutation = useSuggestedItineraryMutation(tripId);
  const confirmMutation = useConfirmPlacementMutation(tripId);

  // 여행 메타는 GET /trips/{id}(옵션 A)를 1순위로, 미로딩 시 온보딩 스토어로 폴백한다.
  const detail = tripDetailQuery.data;
  const meta = useMemo<TripMeta>(
    () => ({
      travelDays: detail?.travel_days ?? form.travel_days,
      destinations: detail?.destinations ?? form.destinations,
      travelers: detail?.companion_count ?? form.companion_count,
      // start_date 는 온보딩에서 백엔드로 전송하지 않아 보통 null 이다.
      // 다른 화면(정리)과 동일하게 캘린더 스토어(사용자가 고른 날짜)로 폴백한다.
      startDate:
        detail?.start_date ??
        (exactDate ? format(exactDate.from, 'yyyy-MM-dd') : null),
    }),
    [
      detail,
      form.travel_days,
      form.destinations,
      form.companion_count,
      exactDate,
    ]
  );

  // 좌측 stock + 헤더 메타. (Day 보드 로딩과 무관하게 먼저 그릴 수 있다.)
  const viewModel = useMemo(() => {
    if (!groups04Query.data || !cardsQuery.data) return null;
    return mapToArrangeViewModel(groups04Query.data, cardsQuery.data, meta);
  }, [groups04Query.data, cardsQuery.data, meta]);

  // 우측 Day 보드는 백엔드 GET /days/{n}(DayViewService) 결과를 SSOT 로 쓴다.
  // 컬럼 개수=travel_days(메타 미로딩 시 0). FE 는 day별 그룹핑/정렬을 재현하지 않는다.
  const daysQuery = useDaysQuery(tripId, meta.travelDays);
  const dayColumns = useMemo(() => {
    if (!cardsQuery.data) return null;
    // travelDays>0 인데 Day 응답이 아직이면 보드를 비우지 않도록 대기.
    if (meta.travelDays > 0 && !daysQuery.isLoaded) return null;
    const dayViewModels = daysQuery.dayViewModels.filter(
      (dvm): dvm is NonNullable<typeof dvm> => dvm != null
    );
    return mapDayColumns(dayViewModels, meta, cardsQuery.data);
  }, [cardsQuery.data, meta, daysQuery.isLoaded, daysQuery.dayViewModels]);

  // 배치 저장 요청 시 카드별 예상 소요 시간 조회용.
  const [chatCardDurations, setChatCardDurations] = useState<
    Record<string, number | null>
  >({});
  const durationByInstance = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const card of cardsQuery.data?.cards ?? []) {
      map[card.instance_id] = card.estimated_duration_min;
    }
    return { ...map, ...chatCardDurations };
  }, [cardsQuery.data, chatCardDurations]);

  // 드래그앤드롭에 따라 좌/우가 함께 바뀌므로 ViewModel 을 로컬 상태로 보관한다.
  // (mutation 후 query 를 invalidate 하지 않으므로 미저장 배치가 덮어써지지 않는다.)
  const [groups, setGroups] = useState<ArrangeCardGroup[]>([]);
  const [days, setDays] = useState<DayColumnViewModel[]>([]);
  useEffect(() => {
    if (viewModel) setGroups(viewModel.groups);
  }, [viewModel]);
  useEffect(() => {
    if (dayColumns) setDays(dayColumns);
  }, [dayColumns]);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<ArrangeCardViewModel | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  // 처리필요 카드 해결(notes 재파싱) 상태: 재처리 진행 중 / 실패·미해결 안내.
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [cardAddFlowOpen, setCardAddFlowOpen] = useState(false);
  const [routeWarnings, setRouteWarnings] = useState<RouteWarning[] | null>(
    null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [travelStyle, setTravelStyle] =
    useState<SuggestedItineraryRequest['travel_style']>('BALANCED');
  const [pace, setPace] = useState<SuggestedItineraryRequest['pace']>('NORMAL');

  // 진행 중인 재처리 폴링 취소 핸들. 카드 전환/언마운트 시 정리한다.
  const resolvePollRef = useRef<(() => void) | null>(null);
  // 폴링 콜백(비동기)이 최신 패널 상태를 읽도록 ref 로 보관한다.
  const detailCardIdRef = useRef<string | null>(null);
  useEffect(() => {
    detailCardIdRef.current = detailCard?.id ?? null;
  }, [detailCard]);
  useEffect(() => () => resolvePollRef.current?.(), [tripId]);

  // 좌측 패널 카운트(전체/미배치)는 현재 상태에서 파생한다.
  const remainingCards = groups.reduce(
    (total, group) => total + group.cards.length,
    0
  );
  const placedCardIds = useMemo(
    () => new Set(days.flatMap((day) => day.cards.map((card) => card.id))),
    [days]
  );

  const openCardDetail = (card: ArrangeCardViewModel) => {
    // 처리필요 카드도 alert 로 끝내지 않고, 해결 패널을 그대로 열어 인플레이스로 해결한다.
    // (안내 문구 card.actionGuide 는 패널 안에서 표시)
    resolvePollRef.current?.();
    setResolving(false);
    setResolveError(null);
    setDetailCard(card);
    setDetailOpen(true);
  };

  // 좌측 목록 카드 → Day 에 배치(targetIndex 위치 삽입).
  const placeFromList = async (
    cardId: string,
    targetDayId: string,
    targetIndex?: number
  ) => {
    const group = groups.find((g) => g.cards.some((c) => c.id === cardId));
    const card = group?.cards.find((c) => c.id === cardId);
    // 드래그 불가(처리 필요/제외) 카드는 배치하지 않는다.
    if (!card || group == null || card.draggable === false) return;

    const alreadyPlaced = days.some((day) =>
      day.cards.some((placed) => placed.id === cardId)
    );

    if (alreadyPlaced) {
      const duplicate = window.confirm(
        `'${card.name}' 카드는 이미 배치되어 있어요. 새 카드로 복제해서 한 번 더 배치할까요?`
      );
      if (!duplicate) return;
      try {
        const created = await duplicateCardMutation.mutateAsync(cardId);
        const clonedCard = cardToStockCard(created);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === group.id ? { ...g, cards: [...g.cards, clonedCard] } : g
          )
        );
        setDays((prev) =>
          prev.map((day) =>
            day.id === targetDayId
              ? {
                  ...day,
                  cards: insertAt(
                    day.cards,
                    toScheduledCard(clonedCard),
                    targetIndex
                  ),
                }
              : day
          )
        );
        setNotice(`'${card.name}' 카드를 복제해서 배치했어요.`);
      } catch (error) {
        const message = errorMessageOf(error, '카드 복제에 실패했습니다.');
        setActionError(
          message.includes('404')
            ? '카드 복제 API를 찾지 못했어요. 백엔드 배포 상태를 확인해 주세요.'
            : message
        );
      }
      return;
    }
    setDays((prev) =>
      prev.map((day) =>
        day.id === targetDayId
          ? {
              ...day,
              cards: insertAt(day.cards, toScheduledCard(card), targetIndex),
            }
          : day
      )
    );
  };

  // Day → Day 이동(또는 같은 Day 내 순서 재정렬). fromDayId 는 payload(non-null) 에서 온다.
  const moveBetweenDays = (
    { cardId, fromDayId }: { cardId: string; fromDayId: string },
    targetDayId: string,
    targetIndex?: number
  ) => {
    const fromDay = days.find((d) => d.id === fromDayId);
    const scheduled = fromDay?.cards.find((c) => c.id === cardId);
    // 고정 시작 시간 카드(항공권 등)는 이동 불가.
    if (!scheduled || scheduled.fixedTime) return;

    if (fromDayId === targetDayId) {
      // 같은 Day 내 재정렬: 제거로 앞쪽 인덱스가 한 칸 당겨지므로 보정.
      const oldIndex = fromDay!.cards.findIndex((c) => c.id === cardId);
      let idx = targetIndex;
      if (idx != null && oldIndex > -1 && oldIndex < idx) idx -= 1;
      setDays((prev) =>
        prev.map((d) => {
          if (d.id !== targetDayId) return d;
          const without = d.cards.filter((c) => c.id !== cardId);
          return { ...d, cards: insertAt(without, scheduled, idx) };
        })
      );
    } else {
      setDays((prev) =>
        prev.map((d) => {
          if (d.id === fromDayId)
            return { ...d, cards: d.cards.filter((c) => c.id !== cardId) };
          if (d.id === targetDayId)
            return { ...d, cards: insertAt(d.cards, scheduled, targetIndex) };
          return d;
        })
      );
    }
  };

  // Day 컬럼 드롭 핸들러 — 출처(좌측/다른 Day)에 따라 분기한다.
  const handleDropOnDay = (
    payload: ArrangeDragPayload,
    targetDayId: string,
    targetIndex?: number
  ) => {
    if (payload.fromDayId === null) {
      void placeFromList(payload.cardId, targetDayId, targetIndex);
    } else {
      moveBetweenDays(
        { cardId: payload.cardId, fromDayId: payload.fromDayId },
        targetDayId,
        targetIndex
      );
    }
    setDraggingCardId(null);
    setConfirmed(false);
  };

  // 배치된 카드를 좌측 목록으로 되돌린다(미배치 복원).
  const returnCardToList = (cardId: string) => {
    const fromDay = days.find((d) => d.cards.some((c) => c.id === cardId));
    const scheduled = fromDay?.cards.find((c) => c.id === cardId);
    // 고정 시작 시간 카드는 좌측으로 되돌리지 않는다.
    if (!scheduled || scheduled.fixedTime) {
      setDraggingCardId(null);
      return;
    }

    setDays((prev) =>
      prev.map((d) =>
        d.id === fromDay!.id
          ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) }
          : d
      )
    );
    setDraggingCardId(null);
    setConfirmed(false);
  };

  const openScheduledCardDetail = (card: ScheduledCardViewModel) => {
    openCardDetail(toArrangeCardFromScheduled(card));
  };

  // 모달에서 추가한 카드 → 서버 저장 후 좌측 "추가한 카드" 그룹에 올린다.
  const handleAddCard = async (
    draft: Parameters<typeof toCardAddRequest>[0]
  ) => {
    if (!tripId) return;
    setActionError(null);
    setNotice(null);
    setCardAddFlowOpen(false);
    try {
      const created = await addCardMutation.mutateAsync(
        toCardAddRequest(draft)
      );
      const newCard = cardToStockCard(created);
      // 직접 추가한 카드는 좌표(지도 위치)가 없어 동선 검증·자동 묶기에서 빠진다. 미리 안내한다.
      if (created.coordinates == null) {
        setNotice(
          `'${created.name}' 카드에 지도 위치 정보가 없어 동선 검증·자동 묶기에서 제외될 수 있어요. 정리 화면에서 정확한 장소로 확인해 주세요.`
        );
      }
      setGroups((prev) => {
        if (prev.some((group) => group.id === ADDED_GROUP_ID)) {
          return prev.map((group) =>
            group.id === ADDED_GROUP_ID
              ? { ...group, cards: [...group.cards, newCard] }
              : group
          );
        }
        return [
          ...prev,
          {
            id: ADDED_GROUP_ID,
            title: '추가한 카드',
            description: '직접 추가한 카드예요. 드래그해서 Day에 배치하세요.',
            cards: [newCard],
          },
        ];
      });
    } catch (error) {
      setActionError(errorMessageOf(error, '카드 추가에 실패했습니다.'));
    }
  };

  // 메모 저장 — PATCH /cards/{instanceId}. 성공 시 로컬 카드 메모만 갱신(배치 상태 유지).
  const handleSaveMemo = async (memo: string) => {
    if (!tripId || !detailCard) return;
    setActionError(null);
    try {
      await patchCardMutation.mutateAsync({
        instanceId: detailCard.id,
        payload: { memo },
      });
      setGroups((prev) =>
        prev.map((group) => ({
          ...group,
          cards: group.cards.map((card) =>
            card.id === detailCard.id && card.detail
              ? { ...card, detail: { ...card.detail, memo } }
              : card
          ),
        }))
      );
      setDetailOpen(false);
    } catch (error) {
      setActionError(errorMessageOf(error, '메모 저장에 실패했습니다.'));
    }
  };

  const handleSaveDisplay = async (payload: CardPatchRequest) => {
    if (!tripId || !detailCard) return;
    setActionError(null);
    try {
      const updated = await patchCardMutation.mutateAsync({
        instanceId: detailCard.id,
        payload,
      });
      applyUpdatedCardLocally(updated);
      setDetailOpen(false);
    } catch (error) {
      setActionError(errorMessageOf(error, '카드 수정에 실패했습니다.'));
    }
  };

  const handleToggleInclusion = async (included: boolean) => {
    if (!tripId || !detailCard) return;
    const instanceId = detailCard.id;
    setActionError(null);
    try {
      await patchCardMutation.mutateAsync({
        instanceId,
        payload: { is_excluded: !included },
      });
      if (!included) {
        setDays((prev) =>
          prev.map((day) => ({
            ...day,
            cards: day.cards.filter((card) => card.id !== instanceId),
          }))
        );
      }
      await refreshLeftGroupsPreservingBoard();
      setDetailOpen(false);
      setNotice(
        included
          ? '카드를 다시 일정 후보에 포함했어요.'
          : '카드를 이번 여행 일정에서 제외했어요.'
      );
      setConfirmed(false);
    } catch (error) {
      setActionError(
        errorMessageOf(
          error,
          included ? '복원 처리에 실패했습니다.' : '제외 처리에 실패했습니다.'
        )
      );
    }
  };

  // 좌측 그룹을 서버 최신(groups04)으로 다시 그린다.
  // Day 보드는 로컬 미저장 배치를 보존하되, 이미 배치된 카드의 표시 상태는 서버 최신값으로 동기화한다.
  // 좌측 Stock 은 배치된 카드도 계속 노출한다.
  const refreshLeftGroupsPreservingBoard = async (): Promise<{
    groups: ArrangeCardGroup[];
    unavailableIds: Set<string>;
  } | null> => {
    if (!tripId) return null;
    const [groupsRes, cardsRes] = await Promise.all([
      fetchGroups04(tripId),
      fetchCards(tripId),
    ]);
    const fresh = mapToArrangeViewModel(groupsRes, cardsRes, meta).groups;
    const cardsById = new Map(
      cardsRes.cards.map((card) => [card.instance_id, card])
    );
    setGroups(fresh);
    setDays((prev) =>
      prev.map((day) => ({
        ...day,
        cards: day.cards.map((card) => {
          const latest = cardsById.get(card.id);
          return latest ? toUpdatedScheduledCard(latest, card) : card;
        }),
      }))
    );
    return {
      groups: fresh,
      unavailableIds: new Set(groupsRes.unavailable.map((c) => c.instance_id)),
    };
  };

  const applyUpdatedCardLocally = (updated: Card) => {
    const updatedStockCard = cardToStockCard(updated);
    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        cards: group.cards.map((card) =>
          card.id === updated.instance_id ? updatedStockCard : card
        ),
      }))
    );
    setDays((prev) =>
      prev.map((day) => ({
        ...day,
        cards: day.cards.map((card) =>
          card.id === updated.instance_id
            ? toUpdatedScheduledCard(updated, card)
            : card
        ),
      }))
    );
    if (detailCardIdRef.current === updated.instance_id) {
      setDetailCard(updatedStockCard);
    }
  };

  // 재처리 폴링 공통 로직: patchCard 완료 후 instanceId 카드가 processing 을 벗어날 때까지
  // 2 초 간격으로 /cards 를 조회하고, 승격(unavailable 이탈) 여부에 따라 패널을 닫거나 재시도 안내를 띄운다.
  const startResolvePoll = (instanceId: string) => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    resolvePollRef.current = () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    const startedAt = Date.now();

    const settle = async (timedOut: boolean) => {
      const result = await refreshLeftGroupsPreservingBoard().catch(() => null);
      if (cancelled) return;
      setResolving(false);
      const promoted = result != null && !result.unavailableIds.has(instanceId);
      if (promoted) {
        setNotice('카드가 배치 가능 목록으로 이동했어요.');
        if (detailCardIdRef.current === instanceId) setDetailOpen(false);
        return;
      }
      if (detailCardIdRef.current === instanceId) {
        const refreshed = result?.groups
          .flatMap((group) => group.cards)
          .find((card) => card.id === instanceId);
        if (refreshed) setDetailCard(refreshed);
        // 후속 질문이 있으면 대화가 이어지는 것이므로 에러 대신 질문을 보여준다.
        if (!refreshed?.detail?.question) {
          setResolveError(
            timedOut
              ? '재처리가 시간 내에 끝나지 않았어요. 잠시 후 다시 시도해 주세요.'
              : '현재 정보로는 위치를 찾지 못했어요. 장소명이나 주소를 더 정확히 입력해 주세요.'
          );
        }
      }
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        const cardsRes = await fetchCards(tripId!);
        if (cancelled) return;
        const card = cardsRes.cards.find((c) => c.instance_id === instanceId);
        const done = !card || card.processing_status !== 'processing';
        if (done) return void settle(false);
      } catch {
        // 일시적 조회 실패는 다음 tick 에서 재시도(타임아웃 내라면).
      }
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) return void settle(true);
      if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    timer = setTimeout(tick, POLL_INTERVAL_MS);
  };

  const hasBackgroundProcessing = (cardsQuery.data?.cards ?? []).some(
    (card) => card.processing_status === 'processing'
  );

  useEffect(() => {
    if (!tripId || !hasBackgroundProcessing) return;
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled) return;
      void refreshLeftGroupsPreservingBoard();
      void cardsQuery.refetch();
      void groups04Query.refetch();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tripId, hasBackgroundProcessing, cardsQuery, groups04Query]);

  // 처리필요 카드 해결 — 자연어(notes) 보완 입력으로 AI 재파싱 트리거.
  const handleResolveByNotes = async (notes: string) => {
    if (!tripId || !detailCard) return;
    const instanceId = detailCard.id;
    setResolveError(null);
    setResolving(true);
    resolvePollRef.current?.();
    try {
      const updated = await patchCardMutation.mutateAsync({
        instanceId,
        payload: { notes },
      });
      applyUpdatedCardLocally(updated);
      // 닫지 않고 유지 — 재파싱 후 후속 질문이 있으면 이어서 보여준다(startResolvePoll).
    } catch (error) {
      setResolving(false);
      setResolveError(errorMessageOf(error, '재처리 요청에 실패했습니다.'));
      return;
    }
    startResolvePoll(instanceId);
  };

  // 처리필요 숙소/교통 카드의 구조화 필드 편집.
  // 위치 변경 시 → 재처리 트리거 + 폴링. 비위치 필드만 → 즉시 저장 후 갱신.
  const handleResolveByStructuredEdit = async ({
    payload,
    locationChanged,
  }: {
    payload: CardPatchRequest;
    locationChanged: boolean;
  }) => {
    if (!tripId || !detailCard) return;
    const instanceId = detailCard.id;
    setResolveError(null);
    setResolving(true);
    resolvePollRef.current?.();
    try {
      await patchCardMutation.mutateAsync({ instanceId, payload });
    } catch (error) {
      setResolving(false);
      setResolveError(errorMessageOf(error, '저장에 실패했습니다.'));
      return;
    }
    if (!locationChanged) {
      // 비위치 필드만 변경 → 폴링 없이 즉시 갱신
      setResolving(false);
      await refreshLeftGroupsPreservingBoard();
      if (detailCardIdRef.current === instanceId) setDetailOpen(false);
      return;
    }
    startResolvePoll(instanceId);
  };

  // 선택처리 — 기존 location 또는 name 을 notes 로 자동 전송해 AI 재파싱 트리거.
  const handleSelectProcess = async () => {
    if (!tripId || !detailCard) return;
    const autoNotes = detailCard.detail?.selectProcessNotes;
    if (!autoNotes) return;
    const instanceId = detailCard.id;
    setResolveError(null);
    setResolving(true);
    resolvePollRef.current?.();
    try {
      await patchCardMutation.mutateAsync({
        instanceId,
        payload: { notes: autoNotes },
      });
    } catch (error) {
      setResolving(false);
      setResolveError(errorMessageOf(error, '재처리 요청에 실패했습니다.'));
      return;
    }
    startResolvePoll(instanceId);
  };

  const handleConfirmSelection = async (payload: {
    choices: string[];
    answer: string;
  }) => {
    if (!tripId || !detailCard) return;
    const selectedText = [...payload.choices, payload.answer]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(', ');
    const notes = buildSelectionNotes({
      cardName: detailCard.name,
      selectedText,
      destinations: meta.destinations,
      region: detailCard.detail?.region,
      userIntent: detailCard.detail?.userIntent,
    });
    await handleResolveByNotes(notes);
  };

  // 정리 반영 — POST /groups/reorder. "재정렬이 필요한 카드"를 클러스터로 재편입한 뒤
  // 좌측 목록만 갱신한다. 이미 Day 에 배치(로컬·미저장)한 카드는 그대로 둔다.
  const handleReorder = async () => {
    if (!tripId || !cardsQuery.data) return;
    setActionError(null);
    setNotice(null);
    try {
      const fresh = await reorderMutation.mutateAsync();
      // 좌측 그룹(vm.groups)만 갱신한다. Day 보드는 로컬 상태를 유지한다.
      const vm = mapToArrangeViewModel(fresh, cardsQuery.data, meta);
      setGroups(vm.groups.filter((group) => group.cards.length > 0));
      setNotice('카드를 다시 정리했어요.');
    } catch (error) {
      setActionError(errorMessageOf(error, '카드 정리에 실패했습니다.'));
    }
  };

  const handleSuggestItinerary = async () => {
    if (!tripId) return;
    setActionError(null);
    setNotice(null);
    try {
      const suggestion = await suggestedItineraryMutation.mutateAsync({
        travel_style: travelStyle,
        pace,
      });
      const cardsById = new Map<string, ScheduledCardViewModel>();
      groups
        .flatMap((group) => group.cards)
        .forEach((card) => cardsById.set(card.id, toScheduledCard(card)));
      days
        .flatMap((day) => day.cards)
        .forEach((card) => cardsById.set(card.id, card));

      setDays((previous) =>
        previous.map((day, index) => {
          const suggestedDay = suggestion.days.find(
            (item) => item.day === index + 1
          );
          const fixedCards = day.cards.filter((card) => card.fixedTime);
          if (!suggestedDay) return { ...day, cards: fixedCards };
          const fixedIds = new Set(fixedCards.map((card) => card.id));
          const suggestedCards = suggestedDay.ordered_instance_ids
            .filter((id) => !fixedIds.has(id))
            .map((id) => cardsById.get(id))
            .filter((card): card is ScheduledCardViewModel => card != null);
          return {
            ...day,
            cards: [...fixedCards, ...suggestedCards],
          };
        })
      );
      setRouteWarnings(null);
      setConfirmed(false);
      setSuggestionDialogOpen(false);
      const placed = suggestion.days.reduce(
        (sum, day) => sum + day.ordered_instance_ids.length,
        0
      );
      const unplaced = suggestion.unplaced_cards.length;
      setNotice(
        unplaced > 0
          ? `${placed}개 카드로 여행 초안을 만들었어요. ${unplaced}개는 위치·일정 조건 때문에 카드 목록에 남겨뒀어요. 원하는 대로 옮겨서 완성해 보세요.`
          : `${placed}개 카드로 여행 초안을 만들었어요. 원하는 대로 옮겨서 완성해 보세요.`
      );
    } catch (error) {
      setActionError(errorMessageOf(error, '여행 초안을 만들지 못했어요.'));
    }
  };

  // 일정 확정 — POST /confirm. 성공 시 확정 상태로 전환.
  const handleConfirm = async () => {
    if (!tripId) return;
    setActionError(null);
    setNotice(null);
    try {
      const result = await confirmMutation.mutateAsync(
        buildPlacementRequest(days, durationByInstance)
      );
      setRouteWarnings([...result.route_warnings]);
      setConfirmed(true);
      posthog.capture('itinerary_confirm_succeeded', { trip_id: tripId });
      // 배치 화면과 확정 화면이 같은 arrange query key를 사용하므로,
      // confirm 저장 직후 서버의 day/day_order를 다시 받아 stale 보드 진입을 막는다.
      await queryClient.invalidateQueries({
        queryKey: ['arrange', tripId],
      });
      navigate(`/confirm${tripId ? `?tripId=${tripId}` : ''}`, {
        state: { notice: '일정이 확정되었습니다.' },
      });
    } catch (error) {
      setActionError(errorMessageOf(error, '일정 확정에 실패했습니다.'));
    }
  };

  const loading = groups04Query.isLoading || cardsQuery.isLoading;
  const loadError =
    groups04Query.error || cardsQuery.error
      ? errorMessageOf(
          groups04Query.error ?? cardsQuery.error,
          '데이터를 불러오지 못했어요.'
        )
      : null;
  const tripMissingHint = !tripId
    ? 'tripId가 없습니다. /onboarding 으로 여행을 먼저 만들거나 URL에 ?tripId=… 를 추가하세요.'
    : null;

  const baseSummary = viewModel?.summary ?? {
    destination: form.destinations[0] ?? '여행',
    extraDestinations: Math.max(form.destinations.length - 1, 0),
    travelers: form.companion_count,
    dateRange: '-',
  };
  // 날짜 표기는 정리 화면과 동일하게 캘린더 스토어를 우선으로 쓰고,
  // 스토어가 비어 있으면(새로고침 등) 백엔드 start_date 로 만든 범위로 폴백한다.
  const storeDateRange = formatDateRangeLabel(
    calendarType,
    exactDate,
    flexDate
  );
  const summary = {
    ...baseSummary,
    dateRange: storeDateRange !== '-' ? storeDateRange : baseSummary.dateRange,
  };
  const heading = viewModel?.heading ?? {
    title: '일정 배치',
    subtitle: loading ? '불러오는 중…' : '카드를 불러오지 못했어요',
  };
  const cardListTitle = viewModel?.cardListTitle ?? '카드 목록';

  const busy =
    confirmMutation.isPending ||
    addCardMutation.isPending ||
    duplicateCardMutation.isPending ||
    reorderMutation.isPending ||
    suggestedItineraryMutation.isPending;

  // "재정렬이 필요한 카드" 그룹이 있을 때만 정리 반영 버튼을 노출한다.
  const hasPendingReorder = groups.some(
    (group) => group.id === 'pending-reorder'
  );

  return (
    <div
      className={cn(
        'flex h-screen flex-col overflow-hidden bg-linear-to-b from-muted/50 to-background',
        PAGE_ENTER
      )}
    >
      <Header
        fluid
        currentStepId="arrange"
        destination={summary.destination}
        extraDestinations={summary.extraDestinations}
        travelers={summary.travelers}
        dateRange={summary.dateRange}
        actions={
          <Button
            size="sm"
            onClick={() => setCardAddFlowOpen(true)}
            disabled={!tripId || busy}
          >
            <Plus aria-hidden="true" />
            카드 추가하기
          </Button>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col">
        {/* 페이지 헤딩 + 우측 액션 */}
        <div className="flex shrink-0 items-start justify-between gap-4 px-6 pt-5 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {heading.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {heading.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hasPendingReorder && (
              <Button
                variant="outline"
                onClick={handleReorder}
                disabled={!tripId || busy}
              >
                {reorderMutation.isPending ? '정리 중…' : '카드 다시 정리하기'}
              </Button>
            )}
            <Button
              onClick={() => setSuggestionDialogOpen(true)}
              disabled={!tripId || busy}
            >
              <Sparkles aria-hidden="true" />
              {suggestedItineraryMutation.isPending
                ? '여행 초안 만드는 중…'
                : '여행 초안 만들기'}
            </Button>
          </div>
        </div>

        {/* 알림 / 에러 / 동선 경고 배너 */}
        {(tripMissingHint || loadError || actionError) && (
          <div
            role="alert"
            className="mx-6 mb-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {tripMissingHint ?? loadError ?? actionError}
          </div>
        )}
        {notice && (
          <div className="mx-6 mb-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            {notice}
          </div>
        )}
        {routeWarnings && routeWarnings.length > 0 && (
          <div className="mx-6 mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            <p className="font-semibold">동선 점검이 필요해요</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {routeWarnings.map((warning, index) => (
                <li key={index}>
                  {warning.day ? `Day ${warning.day}: ` : ''}
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 본문: 좌 카드 목록 + 우 칸반 보드 */}
        {loading && !viewModel ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            불러오는 중…
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 gap-5 px-6 pb-5">
            <CardListPanel
              title={cardListTitle}
              totalCards={remainingCards}
              groups={groups}
              onSelectCard={openCardDetail}
              draggingCardId={draggingCardId}
              placedCardIds={placedCardIds}
              dragActive={draggingCardId !== null}
              onDragCardStart={setDraggingCardId}
              onDragCardEnd={() => setDraggingCardId(null)}
              onReturnCard={returnCardToList}
            />

            {/* 칸반 보드 — 가로 스크롤 */}
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex h-full gap-4">
                {days.map((day) => (
                  <DayColumn
                    key={day.id}
                    {...day}
                    dragActive={draggingCardId !== null}
                    draggingCardId={draggingCardId}
                    onSelectCard={openScheduledCardDetail}
                    onRemoveCard={returnCardToList}
                    onCardDragStart={setDraggingCardId}
                    onCardDragEnd={() => setDraggingCardId(null)}
                    onDropCard={(payload, index) =>
                      handleDropOnDay(payload, day.id, index)
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 하단 푸터 */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-background px-6 py-3">
        <Button
          variant="outline"
          onClick={() =>
            navigate(`/grouping${tripId ? `?tripId=${tripId}` : ''}`)
          }
          disabled={busy}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          이전 단계
        </Button>

        <div className="flex items-center gap-4">
          <Button
            onClick={handleConfirm}
            disabled={!tripId || busy || confirmed}
          >
            {confirmed ? '확정됨' : '일정 확정하기'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </footer>

      <Dialog
        open={suggestionDialogOpen}
        onOpenChange={setSuggestionDialogOpen}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>여행 초안을 만들어볼까요?</DialogTitle>
            <DialogDescription>
              가까운 장소와 선택한 일정 밀도를 기준으로 Day별로 나눠드려요. 만든
              뒤 자유롭게 옮길 수 있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">
                여행 스타일
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['BALANCED', '균형 있게', '맛집과 관광을 고르게'],
                    ['SIGHTSEEING', '관광 중심', '장소를 더 많이'],
                    ['FOOD', '맛집 중심', '먹는 즐거움을 더'],
                  ] as const
                ).map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTravelStyle(value)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition-colors',
                      travelStyle === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-3 text-sm font-semibold">일정 밀도</legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['RELAXED', '여유롭게', '하루 3~4곳'],
                    ['NORMAL', '보통', '하루 4~6곳'],
                    ['PACKED', '알차게', '하루 6~8곳'],
                  ] as const
                ).map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPace(value)}
                    className={cn(
                      'rounded-xl border px-3 py-3 text-left transition-colors',
                      pace === value
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:bg-muted'
                    )}
                  >
                    <span className="block text-sm font-semibold">{label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSuggestItinerary}
              disabled={suggestedItineraryMutation.isPending}
            >
              <Sparkles aria-hidden="true" />
              {suggestedItineraryMutation.isPending
                ? '초안 만드는 중…'
                : '초안 만들기'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 카드 클릭 시 우측에서 열리는 상세 패널 */}
      <CardDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        card={detailCard}
        onSaveMemo={handleSaveMemo}
        onSaveDisplay={handleSaveDisplay}
        onExclude={() => void handleToggleInclusion(false)}
        onInclude={() => void handleToggleInclusion(true)}
        onConfirmSelection={(payload) => void handleConfirmSelection(payload)}
        onResolveByStructuredEdit={handleResolveByStructuredEdit}
        onSelectProcess={handleSelectProcess}
        resolving={resolving}
        resolveError={resolveError}
      />

      <CardAddFlow
        open={cardAddFlowOpen}
        onOpenChange={setCardAddFlowOpen}
        tripId={tripId}
        destination={summary.destination}
        tripStartDate={detail?.start_date}
        travelDays={detail?.travel_days}
        savedActionLabel="배치 화면에서 확인하기"
        onManualSubmit={handleAddCard}
        onAiCardsCreated={async (cards) => {
          setChatCardDurations((current) => ({
            ...current,
            ...Object.fromEntries(
              cards.map((card) => [
                card.instance_id,
                card.estimated_duration_min,
              ])
            ),
          }));
          await refreshLeftGroupsPreservingBoard();
          setConfirmed(false);
        }}
      />
    </div>
  );
};

export default ArrangePage;
