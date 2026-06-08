// ArrangePage (SCR-04 배치 '일정 배치' 페이지)
// 좌측 "카드 목록"(그룹별) + 우측 Day 칸반 보드 + 하단 푸터.
//
// 데이터 흐름:
//  - GET /groups?view=04  → 좌측 배치 가능 스톡(클러스터) + 처리 필요 + 제외
//  - GET /cards           → 우측 Day 보드(배치된 카드) + 예상 소요 시간 조회
//  - 드래그앤드롭은 로컬 상태로만 반영하고,
//  - "동선 검증하기" = POST /verify, "일정 확정하기" = POST /confirm 로 전체 배치 스냅샷을 전송한다.
//    (백엔드에 카드별 day 저장 API 가 없어 스냅샷 일괄 전송만 가능)

import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ArrangeCardDetailPanel from '@/components/arrange/ArrangeCardDetailPanel';
import CardListPanel from '@/components/arrange/CardListPanel';
import DayColumn from '@/components/arrange/DayColumn';
import AddCardModal from '@/components/grouping/AddCardModal';
import Header from '@/components/header/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  useAddCardMutation,
  useArrangeCardsQuery,
  useConfirmPlacementMutation,
  useGroups04Query,
  usePatchCardMutation,
  useVerifyPlacementMutation,
} from '@/hooks/useArrange';
import type {
  ArrangeCardGroup,
  ArrangeCardViewModel,
  DayColumnViewModel,
  ScheduledCardViewModel,
} from '@/types/arrange';
import type { RouteWarning } from '@/types/arrange-api';

import {
  buildPlacementRequest,
  cardToStockCard,
  mapToArrangeViewModel,
} from '../utils/arrange-mapper';
import { parseGroupingApiError } from '../utils/grouping-api';
import { toCardAddRequest } from '../utils/grouping-mapper';
import { useOnboardingStore } from '../utils/onboarding-store';

// 직접 추가한 카드가 모이는 좌측 그룹(첫 추가 시 생성).
const ADDED_GROUP_ID = 'added';

// 좌측 목록 카드 → Day 보드에 배치되는 일정 카드로 변환(로컬 드래그앤드롭용).
const toScheduledCard = (
  card: ArrangeCardViewModel
): ScheduledCardViewModel => ({
  id: card.id,
  name: card.name,
  accent: card.accent,
  badges: card.badges,
});

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
  const tripId: string | null = urlTripId ?? storeTripId;

  useEffect(() => {
    if (urlTripId && urlTripId !== storeTripId) setStoreTripId(urlTripId);
  }, [urlTripId, storeTripId, setStoreTripId]);

  const groups04Query = useGroups04Query(tripId);
  const cardsQuery = useArrangeCardsQuery(tripId);

  const patchCardMutation = usePatchCardMutation(tripId);
  const addCardMutation = useAddCardMutation(tripId);
  const verifyMutation = useVerifyPlacementMutation(tripId);
  const confirmMutation = useConfirmPlacementMutation(tripId);

  // 서버 응답 → 화면 ViewModel.
  const meta = useMemo(
    () => ({
      travelDays: form.travel_days,
      destinations: form.destinations,
      travelers: form.companion_count,
    }),
    [form.travel_days, form.destinations, form.companion_count]
  );

  const viewModel = useMemo(() => {
    if (!groups04Query.data || !cardsQuery.data) return null;
    return mapToArrangeViewModel(groups04Query.data, cardsQuery.data, meta);
  }, [groups04Query.data, cardsQuery.data, meta]);

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
    if (!viewModel) return;
    setGroups(viewModel.groups);
    setDays(viewModel.days);
  }, [viewModel]);

  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<ArrangeCardViewModel | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [routeWarnings, setRouteWarnings] = useState<RouteWarning[] | null>(
    null
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // 좌측 패널 카운트(전체/미배치)는 현재 상태에서 파생한다.
  const remainingCards = groups.reduce(
    (total, group) => total + group.cards.length,
    0
  );
  const unplacedCount = groups
    .flatMap((group) => group.cards)
    .filter((card) => card.draggable !== false).length;

  const openCardDetail = (card: ArrangeCardViewModel) => {
    setDetailCard(card);
    setDetailOpen(true);
  };

  // 카드를 좌측 목록에서 빼고 해당 Day 컬럼에 추가한다(로컬).
  const placeCardOnDay = (cardId: string, dayId: string) => {
    const card = groups
      .flatMap((group) => group.cards)
      .find((item) => item.id === cardId);
    // 드래그 불가(처리 필요/제외) 카드는 배치하지 않는다.
    if (!card || card.draggable === false) {
      setDraggingCardId(null);
      return;
    }

    setGroups((prev) =>
      prev.map((group) => ({
        ...group,
        cards: group.cards.filter((item) => item.id !== cardId),
      }))
    );
    setDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? { ...day, cards: [...day.cards, toScheduledCard(card)] }
          : day
      )
    );
    setDraggingCardId(null);
    setConfirmed(false);
  };

  // 모달에서 추가한 카드 → 서버 저장 후 좌측 "추가한 카드" 그룹에 올린다.
  const handleAddCard = async (
    draft: Parameters<typeof toCardAddRequest>[0]
  ) => {
    if (!tripId) return;
    setActionError(null);
    setAddCardOpen(false);
    try {
      const created = await addCardMutation.mutateAsync(
        toCardAddRequest(draft)
      );
      const newCard = cardToStockCard(created);
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

  // 동선 검증 — POST /verify. 경고 목록을 배너로 표시.
  const handleVerify = async () => {
    if (!tripId) return;
    setActionError(null);
    setNotice(null);
    try {
      const result = await verifyMutation.mutateAsync(
        buildPlacementRequest(days, durationByInstance)
      );
      setRouteWarnings(result.route_warnings);
      setNotice(
        result.route_warnings.length === 0
          ? '동선 문제가 발견되지 않았어요.'
          : null
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
      setRouteWarnings(result.route_warnings);
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

  const summary = viewModel?.summary ?? {
    destination: form.destinations[0] ?? '여행',
    extraDestinations: Math.max(form.destinations.length - 1, 0),
    travelers: form.companion_count,
    dateRange: '-',
  };
  const heading = viewModel?.heading ?? {
    title: '일정 배치',
    subtitle: loading ? '불러오는 중…' : '카드를 불러오지 못했어요',
  };
  const cardListTitle = viewModel?.cardListTitle ?? '카드 목록';

  const busy =
    verifyMutation.isPending ||
    confirmMutation.isPending ||
    addCardMutation.isPending;

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
              onDragCardStart={setDraggingCardId}
              onDragCardEnd={() => setDraggingCardId(null)}
            />

            {/* 칸반 보드 — 가로 스크롤 */}
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="flex h-full gap-4">
                {days.map((day) => (
                  <DayColumn
                    key={day.id}
                    {...day}
                    dragActive={draggingCardId !== null}
                    onDropCard={(cardId) => placeCardOnDay(cardId, day.id)}
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

      {/* 좌하단 플로팅 참여자 아바타 */}
      <Avatar className="fixed bottom-4 left-4 z-50 size-9 shadow-md ring-2 ring-background">
        <AvatarFallback className="bg-orange-500 text-xs font-semibold text-white">
          N
        </AvatarFallback>
      </Avatar>

      {/* 카드 클릭 시 우측에서 열리는 상세 패널 */}
      <ArrangeCardDetailPanel
        open={detailOpen}
        onOpenChange={setDetailOpen}
        card={detailCard}
        onSaveMemo={handleSaveMemo}
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
