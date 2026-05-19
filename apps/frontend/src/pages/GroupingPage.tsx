// GroupingPage (SCR-03 그룹화 '정보 정리하기' 페이지)

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import ProgressStat from '@/components/common/ProgressStat';
import ActionGroupSection from '@/components/grouping/ActionGroupSection';
import AddCardModal from '@/components/grouping/AddCardModal';
import CardDetailPanel from '@/components/grouping/CardDetailPanel';
import EditCardDetailPanel from '@/components/grouping/EditCardDetailPanel';
import PlaceCard from '@/components/grouping/PlaceCard';
import SelectCardDetailPanel from '@/components/grouping/SelectCardDetailPanel';
import TripSummaryCard from '@/components/grouping/TripSummaryCard';
import Header from '@/components/header/Header';
import { Button } from '@/components/ui/button';
import type {
  PlaceCardViewModel,
  TripSummaryViewModel,
} from '@/types/grouping';
import type { Card, Groups03Response } from '@/types/grouping-api';

import {
  addCard,
  fetchCards,
  fetchGroups03,
  parseGroupingApiError,
  patchCard,
} from '../utils/grouping-api';
import {
  mapToGroupingViewModel,
  toCardAddRequest,
  upsertCardIntoGroups,
} from '../utils/grouping-mapper';
import { useOnboardingStore } from '../utils/onboarding-store';

const FALLBACK_SUMMARY: TripSummaryViewModel = {
  destinations: [],
  dateRange: '-',
  nights: 0,
  days: 0,
  travelers: 0,
  totalCards: 0,
  cardStats: [],
  completionPct: 0,
};

type GroupingState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | {
      phase: 'ready';
      groups: Groups03Response;
      contextSummary: string | null;
      busy: boolean;
      errorMessage: string | null;
    }
  | { phase: 'error'; message: string };

type GroupingAction =
  | { type: 'RESET' }
  | { type: 'LOAD_START' }
  | {
      type: 'LOAD_SUCCESS';
      groups: Groups03Response;
      contextSummary: string | null;
    }
  | { type: 'LOAD_FAIL'; message: string }
  | { type: 'BUSY_START' }
  | {
      type: 'REFRESH_SUCCESS';
      groups: Groups03Response;
      contextSummary: string | null;
    }
  | { type: 'UPDATE_CARD'; card: Card }
  | { type: 'BUSY_FAIL'; message: string };

const reducer = (
  state: GroupingState,
  action: GroupingAction
): GroupingState => {
  switch (action.type) {
    case 'RESET':
      return { phase: 'idle' };
    case 'LOAD_START':
      return { phase: 'loading' };
    case 'LOAD_SUCCESS':
      return {
        phase: 'ready',
        groups: action.groups,
        contextSummary: action.contextSummary,
        busy: false,
        errorMessage: null,
      };
    case 'LOAD_FAIL':
      if (state.phase === 'ready') {
        // 이미 데이터가 있으면 화면을 유지하고 에러 메시지만 표시
        return { ...state, busy: false, errorMessage: action.message };
      }
      return { phase: 'error', message: action.message };
    case 'BUSY_START':
      if (state.phase !== 'ready') return state;
      return { ...state, busy: true, errorMessage: null };
    case 'REFRESH_SUCCESS':
      if (state.phase !== 'ready') return state;
      return {
        ...state,
        groups: action.groups,
        contextSummary: action.contextSummary,
        busy: false,
        errorMessage: null,
      };
    case 'UPDATE_CARD':
      if (state.phase !== 'ready') return state;
      return {
        ...state,
        groups: upsertCardIntoGroups(state.groups, action.card),
        busy: false,
        errorMessage: null,
      };
    case 'BUSY_FAIL':
      if (state.phase !== 'ready') return state;
      return { ...state, busy: false, errorMessage: action.message };
    default:
      return state;
  }
};

const errorMessageOf = (error: unknown, fallback: string): string => {
  const apiBody = parseGroupingApiError(error);
  if (apiBody?.message) return apiBody.message;
  if (error instanceof Error) return error.message;
  return fallback;
};

const logStub = (action: string) => () => {
  console.log('[GroupingPage] stub action:', action);
};

const GroupingPage = () => {
  const [searchParams] = useSearchParams();
  const urlTripId = searchParams.get('tripId');
  const storeTripId = useOnboardingStore((s) => s.tripId);
  const setStoreTripId = useOnboardingStore((s) => s.actions.setTripId);
  const tripId: string | null = urlTripId ?? storeTripId;

  // URL의 tripId가 store와 다르면 store에 반영 (다른 페이지로 갔다 와도 일관)
  useEffect(() => {
    if (urlTripId && urlTripId !== storeTripId) {
      setStoreTripId(urlTripId);
    }
  }, [urlTripId, storeTripId, setStoreTripId]);

  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });

  const [reviewCard, setReviewCard] = useState<PlaceCardViewModel | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectCard, setSelectCard] = useState<PlaceCardViewModel | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [editCard, setEditCard] = useState<PlaceCardViewModel | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  const refresh = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!tripId) return;
      const [groupsRes, cardsRes] = await Promise.all([
        fetchGroups03(tripId),
        fetchCards(tripId),
      ]);
      if (signal?.aborted) return;
      dispatch({
        type: 'REFRESH_SUCCESS',
        groups: groupsRes,
        contextSummary: cardsRes.context_summary,
      });
    },
    [tripId]
  );

  // 초기 로딩 / tripId 변경 시 재로딩
  useEffect(() => {
    if (!tripId) {
      dispatch({ type: 'RESET' });
      return;
    }
    const controller = new AbortController();
    dispatch({ type: 'LOAD_START' });
    (async () => {
      try {
        const [groupsRes, cardsRes] = await Promise.all([
          fetchGroups03(tripId),
          fetchCards(tripId),
        ]);
        if (controller.signal.aborted) return;
        dispatch({
          type: 'LOAD_SUCCESS',
          groups: groupsRes,
          contextSummary: cardsRes.context_summary,
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        dispatch({
          type: 'LOAD_FAIL',
          message: errorMessageOf(error, '서버 통신 오류가 발생했습니다.'),
        });
      }
    })();
    return () => controller.abort();
  }, [tripId]);

  const busy = state.phase === 'ready' && state.busy;
  const loading = state.phase === 'loading';

  // patch / add 응답으로 viewModel 부분 업데이트.
  const runCardMutation = useCallback(
    async (
      action: () => Promise<Card>,
      failMessage: string
    ): Promise<boolean> => {
      if (!tripId || busy) return false;
      dispatch({ type: 'BUSY_START' });
      try {
        const updated = await action();
        dispatch({ type: 'UPDATE_CARD', card: updated });
        return true;
      } catch (error) {
        dispatch({
          type: 'BUSY_FAIL',
          message: errorMessageOf(error, failMessage),
        });
        return false;
      }
    },
    [busy, tripId]
  );

  const handleRefresh = useCallback(async () => {
    if (!tripId || busy) return;
    dispatch({ type: 'BUSY_START' });
    try {
      await refresh();
    } catch (error) {
      dispatch({
        type: 'BUSY_FAIL',
        message: errorMessageOf(error, '새로고침에 실패했습니다.'),
      });
    }
  }, [busy, refresh, tripId]);

  const handleExclude = (card: PlaceCardViewModel | null) => {
    if (!card || !tripId) return Promise.resolve(false);
    return runCardMutation(
      () => patchCard(tripId, card.id, { is_excluded: true }),
      '제외 처리에 실패했습니다.'
    );
  };

  const handleInclude = (card: PlaceCardViewModel | null) => {
    if (!card || !tripId) return Promise.resolve(false);
    return runCardMutation(
      () => patchCard(tripId, card.id, { is_excluded: false }),
      '복원 처리에 실패했습니다.'
    );
  };

  const handleSaveMemo = (card: PlaceCardViewModel | null, memo: string) => {
    if (!card || !tripId) return Promise.resolve(false);
    return runCardMutation(
      () => patchCard(tripId, card.id, { memo }),
      '메모 저장에 실패했습니다.'
    );
  };

  const handleConfirmSelect = (card: PlaceCardViewModel | null) => {
    if (!card || !tripId) return Promise.resolve(false);
    return runCardMutation(
      () => patchCard(tripId, card.id, { classification: 'confirmed' }),
      '확정 처리에 실패했습니다.'
    );
  };

  const openReviewDetail = (card: PlaceCardViewModel) => {
    setReviewCard(card);
    setReviewOpen(true);
  };
  const openSelectDetail = (card: PlaceCardViewModel) => {
    setSelectCard(card);
    setSelectOpen(true);
  };
  const openEditDetail = (card: PlaceCardViewModel) => {
    setEditCard(card);
    setEditOpen(true);
  };

  const viewModel = useMemo(() => {
    if (state.phase !== 'ready') return null;
    return mapToGroupingViewModel(state.groups, {
      contextSummary: state.contextSummary,
    });
  }, [state]);

  const tripMissingHint = !tripId
    ? 'tripId가 없습니다. /onboarding 으로 여행을 먼저 만들거나 URL에 ?tripId=… 를 추가하세요.'
    : null;

  const inlineError =
    tripMissingHint ??
    (state.phase === 'error' ? state.message : null) ??
    (state.phase === 'ready' ? state.errorMessage : null);

  const heading = viewModel?.heading ?? {
    title: '정보 정리하기',
    subtitle: loading ? '불러오는 중…' : '카드를 불러오지 못했어요',
  };
  const progress = viewModel?.progress ?? {
    percent: 0,
    activeCount: 0,
    doneCount: 0,
  };
  const groups = viewModel?.groups ?? [];
  const summary = viewModel?.summary ?? FALLBACK_SUMMARY;

  return (
    <div className="min-h-screen bg-muted">
      <Header
        currentStepId="organize"
        destination={summary.destinations[0] ?? '여행'}
        extraDestinations={Math.max(summary.destinations.length - 1, 0)}
        travelers={summary.travelers}
        dateRange={summary.dateRange}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRefresh()}
              disabled={busy || loading || !tripId}
            >
              새로고침
            </Button>
            <Button
              size="sm"
              onClick={() => setAddCardOpen(true)}
              disabled={busy || !tripId}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              카드 추가하기
            </Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-[1180px] px-6 py-8">
        <div className="grid grid-cols-[minmax(0,1fr)_360px] items-start gap-6">
          <div className="flex flex-col gap-5">
            <header>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {heading.title}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {heading.subtitle}
              </p>
            </header>

            {inlineError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {inlineError}
              </div>
            )}

            <ProgressStat
              label="정리 진행률"
              value={progress.percent}
              caption={`활성 카드 ${progress.activeCount}개 중 ${progress.doneCount}개 확인 완료`}
              boxed
            />

            {loading && !viewModel ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                불러오는 중…
              </p>
            ) : (
              groups.map((group) => (
                <ActionGroupSection
                  key={group.variant}
                  variant={group.variant}
                  title={group.title}
                  countLabel={group.countLabel}
                  defaultOpen={group.defaultOpen}
                >
                  {group.cards.map((card) => (
                    <PlaceCard
                      key={card.id}
                      {...card}
                      onClick={
                        card.detail
                          ? () => openReviewDetail(card)
                          : card.editDetail
                            ? () => openEditDetail(card)
                            : card.selectDetail
                              ? () => openSelectDetail(card)
                              : logStub(`open-card:${card.id}`)
                      }
                      onAction={logStub(`card-action:${card.id}`)}
                    />
                  ))}
                </ActionGroupSection>
              ))
            )}
          </div>

          <aside className="sticky top-34">
            <TripSummaryCard
              {...summary}
              onNext={logStub('next-step')}
              onPrev={logStub('prev-step')}
            />
          </aside>
        </div>
      </main>

      <CardDetailPanel
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        card={reviewCard}
        onExclude={async () => {
          if (await handleExclude(reviewCard)) setReviewOpen(false);
        }}
        onInclude={async () => {
          if (await handleInclude(reviewCard)) setReviewOpen(false);
        }}
        onSaveMemo={async (memo) => {
          await handleSaveMemo(reviewCard, memo);
        }}
      />

      <SelectCardDetailPanel
        open={selectOpen}
        onOpenChange={setSelectOpen}
        card={selectCard}
        onConfirm={async (payload) => {
          console.log('[GroupingPage] select payload', payload);
          if (await handleConfirmSelect(selectCard)) setSelectOpen(false);
        }}
        onExclude={async () => {
          if (await handleExclude(selectCard)) setSelectOpen(false);
        }}
        onSaveMemo={async (memo) => {
          await handleSaveMemo(selectCard, memo);
        }}
      />

      <EditCardDetailPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        card={editCard}
        onConfirm={(payload) => {
          // 수정 재처리 전용 API는 아직 미구현. 연결되면 별도 mutation으로 교체 예정.
          console.log('[GroupingPage] edit payload (미구현)', payload);
          dispatch({
            type: 'BUSY_FAIL',
            message: '수정 재처리 API는 아직 연결되지 않았습니다.',
          });
        }}
        onSaveMemo={async (memo) => {
          await handleSaveMemo(editCard, memo);
        }}
      />

      <AddCardModal
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        onSubmit={async (draft) => {
          if (!tripId) return;
          setAddCardOpen(false);
          await runCardMutation(
            () => addCard(tripId, toCardAddRequest(draft)),
            '카드 추가에 실패했습니다.'
          );
        }}
      />
    </div>
  );
};

export default GroupingPage;
