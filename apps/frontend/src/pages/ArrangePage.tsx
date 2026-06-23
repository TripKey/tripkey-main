// ArrangePage (SCR-04 배치 '일정 배치' 페이지)
// 좌측 "카드 목록"(그룹별) + 우측 Day 칸반 보드 + 하단 푸터.
//
// 데이터 흐름:
//  - GET /groups?view=04  → 좌측 배치 가능 스톡(클러스터) + 처리 필요 + 제외
//  - GET /cards           → 우측 Day 보드(배치된 카드) + 예상 소요 시간 조회
//  - 드래그앤드롭은 로컬 상태로만 반영하고,
//  - "동선 검증하기" = POST /verify, "일정 확정하기" = POST /confirm 로 전체 배치 스냅샷을 전송한다.
//    (백엔드에 카드별 day 저장 API 가 없어 스냅샷 일괄 전송만 가능)

import { format } from 'date-fns';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ArrangeCardDetailPanel from '@/components/arrange/ArrangeCardDetailPanel';
import CardListPanel from '@/components/arrange/CardListPanel';
import DayColumn from '@/components/arrange/DayColumn';
import AddCardModal from '@/components/grouping/AddCardModal';
import Header from '@/components/header/Header';
import { Button } from '@/components/ui/button';
import {
  useAddCardMutation,
  useArrangeCardsQuery,
  useConfirmPlacementMutation,
  useDaysQuery,
  useGroups04Query,
  usePatchCardMutation,
  useReorderGroupsMutation,
  useVerifyPlacementMutation,
} from '@/hooks/useArrange';
import { useTripDetailQuery } from '@/hooks/useTripDetail';
import type {
  ArrangeCardGroup,
  ArrangeCardViewModel,
  DayColumnViewModel,
  ScheduledCardViewModel,
} from '@/types/arrange';
import type { RouteWarning } from '@/types/arrange-api';
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

// 좌측 목록 카드 → Day 보드에 배치되는 일정 카드로 변환(로컬 드래그앤드롭용).
const toScheduledCard = (
  card: ArrangeCardViewModel
): ScheduledCardViewModel => ({
  id: card.id,
  name: card.name,
  accent: card.accent,
  badges: card.badges,
});

// 배치 보드 카드 → 좌측 목록 카드로 되돌릴 때의 폴백 변환(원본 보존 실패 시).
const toArrangeCard = (card: ScheduledCardViewModel): ArrangeCardViewModel => ({
  id: card.id,
  name: card.name,
  accent: card.accent,
  badges: card.badges,
  draggable: true,
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

const ArrangePage = () => {
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
  const reorderMutation = useReorderGroupsMutation(tripId);
  const verifyMutation = useVerifyPlacementMutation(tripId);
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
  const durationByInstance = useMemo(() => {
    const map: Record<string, number | null> = {};
    for (const card of cardsQuery.data?.cards ?? []) {
      map[card.instance_id] = card.estimated_duration_min;
    }
    return map;
  }, [cardsQuery.data]);

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
  // 좌측 → Day 배치 시 원본 카드를 보존한다. 좌측으로 되돌릴 때 detail/메모 등
  // ScheduledCardViewModel 이 들고 있지 않은 필드까지 복원하기 위함.
  const originalCardsRef = useRef<
    Map<string, { card: ArrangeCardViewModel; groupId: string }>
  >(new Map());
  const [detailCard, setDetailCard] = useState<ArrangeCardViewModel | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  // 처리필요 카드 해결(notes 재파싱) 상태: 재처리 진행 중 / 실패·미해결 안내.
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [routeWarnings, setRouteWarnings] = useState<RouteWarning[] | null>(
    null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // 진행 중인 재처리 폴링 취소 핸들. 카드 전환/언마운트 시 정리한다.
  const resolvePollRef = useRef<(() => void) | null>(null);
  // 폴링 콜백(비동기)이 최신 보드/패널 상태를 읽도록 ref 로 보관한다.
  const daysRef = useRef<DayColumnViewModel[]>([]);
  const detailCardIdRef = useRef<string | null>(null);
  useEffect(() => {
    daysRef.current = days;
  }, [days]);
  useEffect(() => {
    detailCardIdRef.current = detailCard?.id ?? null;
  }, [detailCard]);
  useEffect(() => () => resolvePollRef.current?.(), [tripId]);

  // 좌측 패널 카운트(전체/미배치)는 현재 상태에서 파생한다.
  const remainingCards = groups.reduce(
    (total, group) => total + group.cards.length,
    0
  );
  const unplacedCount = groups
    .flatMap((group) => group.cards)
    .filter((card) => card.draggable !== false).length;

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
  const placeFromList = (
    cardId: string,
    targetDayId: string,
    targetIndex?: number
  ) => {
    const group = groups.find((g) => g.cards.some((c) => c.id === cardId));
    const card = group?.cards.find((c) => c.id === cardId);
    // 드래그 불가(처리 필요/제외) 카드는 배치하지 않는다.
    if (!card || group == null || card.draggable === false) return;

    // 되돌리기 복원용으로 원본 카드 + 원래 그룹 id 보존.
    originalCardsRef.current.set(cardId, { card, groupId: group.id });
    setGroups((prev) =>
      prev.map((g) => ({
        ...g,
        cards: g.cards.filter((c) => c.id !== cardId),
      }))
    );
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
      placeFromList(payload.cardId, targetDayId, targetIndex);
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

    const saved = originalCardsRef.current.get(cardId);
    const restored = saved?.card ?? toArrangeCard(scheduled);

    setDays((prev) =>
      prev.map((d) =>
        d.id === fromDay!.id
          ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) }
          : d
      )
    );
    setGroups((prev) => {
      // 원래 그룹이 남아 있으면 그곳으로, 아니면 "추가한 카드" 또는 첫 그룹으로 폴백.
      const originGroupId = saved?.groupId;
      const targetGroupId =
        originGroupId && prev.some((g) => g.id === originGroupId)
          ? originGroupId
          : prev.some((g) => g.id === ADDED_GROUP_ID)
            ? ADDED_GROUP_ID
            : prev[0]?.id;
      if (targetGroupId) {
        return prev.map((g) =>
          g.id === targetGroupId ? { ...g, cards: [...g.cards, restored] } : g
        );
      }
      // 좌측이 완전히 비어 있던 경우 새 그룹 생성.
      return [
        {
          id: 'restored',
          title: '카드 목록',
          description: '다시 Day에 배치할 수 있어요.',
          cards: [restored],
        },
      ];
    });
    originalCardsRef.current.delete(cardId);
    setDraggingCardId(null);
    setConfirmed(false);
  };

  // 모달에서 추가한 카드 → 서버 저장 후 좌측 "추가한 카드" 그룹에 올린다.
  const handleAddCard = async (
    draft: Parameters<typeof toCardAddRequest>[0]
  ) => {
    if (!tripId) return;
    setActionError(null);
    setNotice(null);
    setAddCardOpen(false);
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

  // 좌측 그룹을 서버 최신(groups04)으로 다시 그린다.
  // 단, 우측 보드에 배치(로컬·미저장)된 카드는 좌측에 다시 나타나지 않도록 제외해
  // "mutation 후 query invalidate 안 함" 불변식(미저장 배치 보존)을 깨지 않는다.
  const refreshLeftGroupsPreservingBoard = async (): Promise<{
    groups: ArrangeCardGroup[];
    unavailableIds: Set<string>;
  } | null> => {
    if (!tripId) return null;
    const [groupsRes, cardsRes] = await Promise.all([
      fetchGroups04(tripId),
      fetchCards(tripId),
    ]);
    const placedIds = new Set(
      daysRef.current.flatMap((day) => day.cards.map((card) => card.id))
    );
    const fresh = mapToArrangeViewModel(groupsRes, cardsRes, meta).groups.map(
      (group) => ({
        ...group,
        cards: group.cards.filter((card) => !placedIds.has(card.id)),
      })
    );
    setGroups(fresh);
    return {
      groups: fresh,
      unavailableIds: new Set(groupsRes.unavailable.map((c) => c.instance_id)),
    };
  };

  // 처리필요 카드 해결 — 자연어(notes) 보완 입력으로 카드 레벨 AI 재파싱을 트리거하고,
  // 재처리(processing)가 끝날 때까지 폴링한 뒤 결과를 좌측 목록에 반영한다.
  // 성공(배치 가능 승격) → 패널 닫기 / 미해결·타임아웃 → 패널 유지(재시도 가능).
  const handleResolveByNotes = async (notes: string) => {
    if (!tripId || !detailCard) return;
    const instanceId = detailCard.id;
    setResolveError(null);
    setResolving(true);
    resolvePollRef.current?.();

    try {
      await patchCardMutation.mutateAsync({
        instanceId,
        payload: { notes },
      });
    } catch (error) {
      setResolving(false);
      setResolveError(errorMessageOf(error, '재처리 요청에 실패했습니다.'));
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    resolvePollRef.current = () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
    const startedAt = Date.now();

    // 폴링 종료 처리: 좌측 목록을 갱신하고, 승격 여부에 따라 패널을 닫거나 재시도 안내를 띄운다.
    const settle = async (timedOut: boolean) => {
      const result = await refreshLeftGroupsPreservingBoard().catch(() => null);
      if (cancelled) return;
      setResolving(false);
      const promoted = result != null && !result.unavailableIds.has(instanceId);
      if (promoted) {
        setNotice('카드가 배치 가능 목록으로 이동했어요.');
        // 패널이 아직 이 카드를 보여주는 중일 때만 닫는다.
        if (detailCardIdRef.current === instanceId) setDetailOpen(false);
        return;
      }
      // 아직 해결 안 됨 — 패널을 열어둔 채 최신 카드 상태로 갱신해 다시 시도할 수 있게 한다.
      if (detailCardIdRef.current === instanceId) {
        const refreshed = result?.groups
          .flatMap((group) => group.cards)
          .find((card) => card.id === instanceId);
        if (refreshed) setDetailCard(refreshed);
        setResolveError(
          timedOut
            ? '재처리가 시간 내에 끝나지 않았어요. 잠시 후 다시 시도해 주세요.'
            : '아직 배치할 수 없어요. 장소명·주소를 더 정확히 입력해 다시 시도해 주세요.'
        );
      }
    };

    const tick = async () => {
      if (cancelled) return;
      try {
        const cardsRes = await fetchCards(tripId);
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
      const placedIds = new Set(
        days.flatMap((day) => day.cards).map((card) => card.id)
      );
      setGroups(
        vm.groups
          .map((group) => ({
            ...group,
            cards: group.cards.filter((card) => !placedIds.has(card.id)),
          }))
          .filter((group) => group.cards.length > 0)
      );
      setNotice('카드를 다시 정리했어요.');
    } catch (error) {
      setActionError(errorMessageOf(error, '카드 정리에 실패했습니다.'));
    }
  };

  // 배치된 카드 중 좌표(지도 위치)가 없는 카드에 대한 안내 경고를 합성한다.
  // 백엔드 RouteValidator 는 geom 이 null 인 카드를 거리 검증에서 조용히 제외하고
  // 경고를 내려주지 않으므로(배치 자체는 허용), FE 가 검증 흐름에서 보완 안내한다.
  const buildMissingLocationWarnings = (): RouteWarning[] => {
    const noCoordsNames = new Map(
      (cardsQuery.data?.cards ?? [])
        .filter((card) => card.coordinates == null)
        .map((card) => [card.instance_id, card.name])
    );
    const warnings: RouteWarning[] = [];
    days.forEach((day, index) => {
      day.cards.forEach((card) => {
        if (!noCoordsNames.has(card.id)) return;
        warnings.push({
          type: 'missing_location',
          day: index + 1,
          instance_ids: [card.id],
          message: `'${noCoordsNames.get(card.id) ?? card.name}' 카드는 위치 정보가 없어 거리 검증에서 제외됐어요. 정확한 장소를 확인해 주세요.`,
          distance_meters: null,
          total_minutes: null,
        });
      });
    });
    return warnings;
  };

  // 동선 검증 — POST /verify. 경고 목록을 배너로 표시.
  const handleVerify = async () => {
    if (!tripId) return;
    setActionError(null);
    setNotice(null);
    try {
      const result = await verifyMutation.mutateAsync(
        buildPlacementRequest(days, durationByInstance)
      );
      const warnings = [
        ...result.route_warnings,
        ...buildMissingLocationWarnings(),
      ];
      setRouteWarnings(warnings);
      setNotice(
        warnings.length === 0 ? '동선 문제가 발견되지 않았어요.' : null
      );
    } catch (error) {
      setActionError(errorMessageOf(error, '동선 검증에 실패했습니다.'));
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
      setRouteWarnings([
        ...result.route_warnings,
        ...buildMissingLocationWarnings(),
      ]);
      setConfirmed(true);
      setNotice('일정이 확정되었습니다.');
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
    verifyMutation.isPending ||
    confirmMutation.isPending ||
    addCardMutation.isPending ||
    reorderMutation.isPending;

  // "재정렬이 필요한 카드" 그룹이 있을 때만 정리 반영 버튼을 노출한다.
  const hasPendingReorder = groups.some(
    (group) => group.id === 'pending-reorder'
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted">
      <Header
        currentStepId="arrange"
        destination={summary.destination}
        extraDestinations={summary.extraDestinations}
        travelers={summary.travelers}
        dateRange={summary.dateRange}
        actions={
          <Button
            size="sm"
            onClick={() => setAddCardOpen(true)}
            disabled={!tripId || busy}
          >
            <Plus className="size-4" aria-hidden="true" />
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
            <p className="mt-1 text-sm text-muted-foreground">
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
              variant="outline"
              onClick={handleVerify}
              disabled={!tripId || busy}
            >
              {verifyMutation.isPending ? '검증 중…' : '동선 검증하기'}
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
        <Button variant="outline" disabled>
          <ArrowLeft className="size-4" aria-hidden="true" />
          이전 단계
        </Button>

        <div className="flex items-center gap-4">
          {unplacedCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {unplacedCount}개 카드가 아직 배치되지 않았습니다
            </span>
          )}
          <Button
            onClick={handleConfirm}
            disabled={!tripId || busy || confirmed}
          >
            {confirmed ? '확정됨' : '일정 확정하기'}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </footer>

      {/* 카드 클릭 시 우측에서 열리는 상세 패널 */}
      <ArrangeCardDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        card={detailCard}
        onSaveMemo={handleSaveMemo}
        onResolveByNotes={handleResolveByNotes}
        resolving={resolving}
        resolveError={resolveError}
      />

      {/* "카드 추가하기" 모달 — 정리 화면(SCR-03)의 AddCardModal 재사용 */}
      <AddCardModal
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        onSubmit={handleAddCard}
      />
    </div>
  );
};

export default ArrangePage;
