// GroupingPage (SCR-03 그룹화 '정보 정리하기' 페이지)

import { Plus } from 'lucide-react';
import posthog from 'posthog-js';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import CardAddFlow from '@/components/card-add/CardAddFlow';
import ProgressStat from '@/components/common/ProgressStat';
import ActionGroupSection from '@/components/grouping/ActionGroupSection';
import CardDetailPanel from '@/components/grouping/CardDetailPanel';
import EditCardDetailPanel from '@/components/grouping/EditCardDetailPanel';
import PlaceCard from '@/components/grouping/PlaceCard';
import SelectCardDetailPanel from '@/components/grouping/SelectCardDetailPanel';
import TripSummaryCard from '@/components/grouping/TripSummaryCard';
import Header from '@/components/header/Header';
import { Button } from '@/components/ui/button';
import { useTripDetailQuery } from '@/hooks/useTripDetail';
import type {
  PlaceCardViewModel,
  TripSummaryViewModel,
} from '@/types/grouping';
import type { Card, Groups03Response } from '@/types/grouping-api';

import PageTransition from '../components/common/PageTransition';
import type { CardPatchRequest } from '../types/grouping-api';
import {
  useCalendarStore,
  formatDateRangeLabel,
} from '../utils/calendar-store';
import { useDumpStore } from '../utils/dump-store';
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

// 카드 재파싱 자동 새로고침 폴링 주기/최대 대기
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;

// 정리 진행률: 요약 카드로 통합되어 현재 숨김 (재노출 시 true)
const SHOW_PROGRESS_STAT = false;

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const clearJob = useDumpStore((s) => s.actions.clearJob);

  const handlePrev = () => {
    clearJob(); // 완료된 jobId 제거 → dump 재진입 시 grouping으로 튕기는 것 방지
    navigate('/dump');
  };
  const urlTripId = searchParams.get('tripId');
  const storeTripId = useOnboardingStore((s) => s.tripId);
  const setStoreTripId = useOnboardingStore((s) => s.actions.setTripId);
  const tripId: string | null = urlTripId ?? storeTripId;

  // 여행지/일정/동행자 등 트립 메타데이터는 groups API 응답에 없으므로 온보딩/캘린더 스토어에서 채운다.
  const destinations = useOnboardingStore((s) => s.form.destinations);
  const companionCount = useOnboardingStore((s) => s.form.companion_count);
  const { type: calendarType, exactDate, flexDate } = useCalendarStore();

  // URL의 tripId가 store와 다르면 store에 반영 (다른 페이지로 갔다 와도 일관)
  useEffect(() => {
    if (urlTripId && urlTripId !== storeTripId) {
      setStoreTripId(urlTripId);
    }
  }, [urlTripId, storeTripId, setStoreTripId]);

  // 여행 요약(여행지/일수/인원/기간)은 GET /trips/{id} 로 채운다.
  const tripDetailQuery = useTripDetailQuery(tripId);

  const [state, dispatch] = useReducer(reducer, { phase: 'idle' });

  const [reviewCard, setReviewCard] = useState<PlaceCardViewModel | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectCard, setSelectCard] = useState<PlaceCardViewModel | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  // 답변 후 재파싱 결과에 후속 질문이 있으면 패널을 이어서 유지하기 위한 대기 카드 id
  const [awaitingSelectId, setAwaitingSelectId] = useState<string | null>(null);
  const [editCard, setEditCard] = useState<PlaceCardViewModel | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [cardAddFlowOpen, setCardAddFlowOpen] = useState(false);

  // EditCardDetailPanel 구조화 편집/선택처리 전용 상태
  const [editResolving, setEditResolving] = useState(false);
  const [editResolveError, setEditResolveError] = useState<string | null>(null);
  const editPollRef = useRef<(() => void) | null>(null);

  // editCard 가 바뀔 때 이전 폴링 취소 + 에러 초기화
  useEffect(() => {
    editPollRef.current?.();
    setEditResolving(false);
    setEditResolveError(null);
  }, [editCard?.id]);

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

  // 카드 레벨 재파싱(notes) 이후 processing 이 풀릴 때까지 주기적으로 자동 새로고침
  const pollCancelRef = useRef<(() => void) | null>(null);

  const pollUntilCardSettled = useCallback(
    (instanceId: string) => {
      if (!tripId) return;
      // 진행 중이던 폴링이 있으면 취소 (마지막 confirm 기준으로만 동작)
      pollCancelRef.current?.();

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      pollCancelRef.current = () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };

      const startedAt = Date.now();
      const tick = async () => {
        try {
          const [groupsRes, cardsRes] = await Promise.all([
            fetchGroups03(tripId),
            fetchCards(tripId),
          ]);
          if (cancelled) return;
          dispatch({
            type: 'REFRESH_SUCCESS',
            groups: groupsRes,
            contextSummary: cardsRes.context_summary,
          });
          const card = cardsRes.cards.find((c) => c.instance_id === instanceId);
          const settled = !card || card.processing_status !== 'processing';
          if (settled || Date.now() - startedAt > POLL_TIMEOUT_MS) return;
        } catch {
          // 폴링 실패는 조용히 중단 — 사용자는 상단 새로고침으로 재시도 가능
          return;
        }
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
      };

      timer = setTimeout(tick, POLL_INTERVAL_MS);
    },
    [tripId]
  );

  // tripId 변경/언마운트 시 진행 중 폴링 정리
  useEffect(() => () => pollCancelRef.current?.(), [tripId]);
  useEffect(() => () => editPollRef.current?.(), [tripId]);

  // EditCardDetailPanel 구조화 편집용 폴링: 처리 완료 시 결과 피드백
  const startEditResolvePoll = useCallback(
    (instanceId: string) => {
      if (!tripId) return;
      editPollRef.current?.();

      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | null = null;
      editPollRef.current = () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
      const startedAt = Date.now();

      const settle = async (timedOut: boolean) => {
        try {
          const [groupsRes, cardsRes] = await Promise.all([
            fetchGroups03(tripId),
            fetchCards(tripId),
          ]);
          if (cancelled) return;
          dispatch({
            type: 'REFRESH_SUCCESS',
            groups: groupsRes,
            contextSummary: cardsRes.context_summary,
          });
          const stillProblem = groupsRes.fix_required.some(
            (c) => c.instance_id === instanceId
          );
          setEditResolving(false);
          if (!stillProblem) {
            setEditOpen(false);
          } else {
            setEditResolveError(
              timedOut
                ? '재처리가 시간 내에 끝나지 않았어요. 잠시 후 다시 시도해 주세요.'
                : '현재 정보로는 위치를 찾지 못했어요. 장소명이나 주소를 더 정확히 입력해 주세요.'
            );
          }
        } catch {
          if (!cancelled) {
            setEditResolving(false);
            setEditResolveError(
              '재처리 결과를 확인하지 못했어요. 새로고침을 시도해 주세요.'
            );
          }
        }
      };

      const tick = async () => {
        if (cancelled) return;
        try {
          const [groupsRes, cardsRes] = await Promise.all([
            fetchGroups03(tripId),
            fetchCards(tripId),
          ]);
          if (cancelled) return;
          dispatch({
            type: 'REFRESH_SUCCESS',
            groups: groupsRes,
            contextSummary: cardsRes.context_summary,
          });
          const card = cardsRes.cards.find((c) => c.instance_id === instanceId);
          if (!card || card.processing_status !== 'processing')
            return settle(false);
        } catch {
          // 일시적 실패는 다음 tick 에서 재시도
        }
        if (Date.now() - startedAt > POLL_TIMEOUT_MS) return settle(true);
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
      };

      timer = setTimeout(tick, POLL_INTERVAL_MS);
    },
    [tripId]
  );

  // 처리필요 숙소/교통 카드의 구조화 필드 편집 저장
  const handleResolveByStructuredEdit = useCallback(
    async ({
      payload,
      locationChanged,
    }: {
      payload: CardPatchRequest;
      locationChanged: boolean;
    }) => {
      if (!tripId || !editCard || editResolving) return;
      const instanceId = editCard.id;
      setEditResolveError(null);
      setEditResolving(true);
      try {
        await patchCard(tripId, instanceId, payload);
      } catch (error) {
        setEditResolving(false);
        setEditResolveError(errorMessageOf(error, '저장에 실패했습니다.'));
        return;
      }
      if (!locationChanged) {
        // 비위치 필드만 → 즉시 갱신, 폴링 없음
        try {
          const [groupsRes, cardsRes] = await Promise.all([
            fetchGroups03(tripId),
            fetchCards(tripId),
          ]);
          dispatch({
            type: 'REFRESH_SUCCESS',
            groups: groupsRes,
            contextSummary: cardsRes.context_summary,
          });
        } catch {
          /* 실패 시 무시 */
        }
        setEditResolving(false);
        setEditOpen(false);
        return;
      }
      startEditResolvePoll(instanceId);
    },
    [tripId, editCard, editResolving, startEditResolvePoll]
  );

  // notes 보완 입력 → AI 재파싱 트리거 (EditCardDetailPanel 에서 직접 notes 입력 시)
  const handleResolveByNotesEdit = useCallback(
    async (notes: string) => {
      if (!tripId || !editCard || editResolving) return;
      const instanceId = editCard.id;
      setEditResolveError(null);
      setEditResolving(true);
      try {
        await patchCard(tripId, instanceId, { notes });
      } catch (error) {
        setEditResolving(false);
        setEditResolveError(
          errorMessageOf(error, '재처리 요청에 실패했습니다.')
        );
        return;
      }
      startEditResolvePoll(instanceId);
    },
    [tripId, editCard, editResolving, startEditResolvePoll]
  );

  // 선택처리 — 기존 location/name 을 notes 로 자동 전송
  const handleSelectProcessEdit = useCallback(async () => {
    if (!tripId || !editCard || editResolving) return;
    const autoNotes = editCard.editDetail?.selectProcessNotes;
    if (!autoNotes) return;
    const instanceId = editCard.id;
    setEditResolveError(null);
    setEditResolving(true);
    try {
      await patchCard(tripId, instanceId, { notes: autoNotes });
    } catch (error) {
      setEditResolving(false);
      setEditResolveError(errorMessageOf(error, '재처리 요청에 실패했습니다.'));
      return;
    }
    startEditResolvePoll(instanceId);
  }, [tripId, editCard, editResolving, startEditResolvePoll]);

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

  // SCR-04 진입은 미해결 카드(input/select/fix_required) 잔존 여부로 차단하지 않는다.
  // 기획상 SCR-04는 "완성된 카드만 배치하는 화면"이 아니라, 결정/입력/위치 확인이
  // 필요한 카드도 이어서 확인하며 일정 배치까지 가져가는 화면이기 때문이다.
  const nextDisabled = busy;

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

  const handleSaveMemo = async (
    card: PlaceCardViewModel | null,
    memo: string
  ) => {
    if (!card || !tripId) return false;
    const ok = await runCardMutation(
      () => patchCard(tripId, card.id, { memo }),
      '메모 저장에 실패했습니다.'
    );
    if (ok) {
      window.alert('메모가 저장되었습니다.');
    }
    return ok;
  };

  const handleSaveDisplay = async (
    card: PlaceCardViewModel | null,
    payload: CardPatchRequest
  ) => {
    if (!card || !tripId) return false;
    const ok = await runCardMutation(
      () => patchCard(tripId, card.id, payload),
      '카드 수정에 실패했습니다.'
    );
    if (ok) {
      window.alert('카드 정보가 저장되었습니다.');
    }
    return ok;
  };

  const handleConfirmSelect = (
    card: PlaceCardViewModel | null,
    payload: { choices: string[]; answer: string }
  ) => {
    if (!card || !tripId) return Promise.resolve(false);
    // 선택값을 단순 문장으로 던지지 않고 "선택 후보"와 여행 맥락을 분리해
    // card-level parse/Places lookup 이 장소명을 우선 검색하도록 돕는다.
    const selectedText = [...payload.choices, payload.answer]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(', ');
    const notes = buildSelectionNotes({
      cardName: card.name,
      selectedText,
      destinations: tripDetailQuery.data?.destinations ?? destinations,
      region: card.region,
      userIntent:
        card.selectDetail?.userIntent ??
        card.detail?.userIntent ??
        card.editDetail?.userIntent,
    });
    return runCardMutation(
      () => patchCard(tripId, card.id, { notes }),
      '확인 처리에 실패했습니다.'
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
      trip: tripDetailQuery.data,
    });
  }, [state, tripDetailQuery.data]);

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
  const groups = useMemo(() => viewModel?.groups ?? [], [viewModel]);

  // 답변 후: 재파싱이 끝나면(폴링으로 groups 갱신) 후속 질문이 있으면 그 질문으로 패널을 갱신(유지),
  // 없으면(해결) 닫는다. — 패널이 닫혀서 후속 질문을 놓치던 문제 해결.
  useEffect(() => {
    if (!awaitingSelectId) return;
    const updated = groups
      .flatMap((group) => group.cards)
      .find((card) => card.id === awaitingSelectId);
    if (!updated || updated.processing) return; // 아직 처리 중이면 다음 폴링까지 대기
    if (updated.selectDetail?.question) {
      setSelectCard(updated); // 후속 질문으로 재바인딩 — 패널 유지
    } else {
      setSelectOpen(false); // 해결됨 — 닫기
    }
    setAwaitingSelectId(null);
  }, [groups, awaitingSelectId]);
  const nights = exactDate?.nights ?? flexDate?.nights ?? 0;
  const summary: TripSummaryViewModel = {
    ...(viewModel?.summary ?? FALLBACK_SUMMARY),
    destinations: destinations.length ? destinations : ['-'],
    dateRange: formatDateRangeLabel(calendarType, exactDate, flexDate),
    nights,
    days: nights + 1,
    travelers: companionCount,
  };

  return (
    <PageTransition>
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
              onClick={() => setCardAddFlowOpen(true)}
              disabled={busy || !tripId}
            >
              <Plus aria-hidden="true" />
              카드 추가하기
            </Button>
          </>
        }
      />

      <main className="flex min-h-[calc(100vh-8rem)] items-start justify-center bg-linear-to-b from-muted/50 to-background px-4 pt-10 pb-16 sm:pt-14">
        <div className="w-full max-w-6xl">
          <header className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {heading.title}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {heading.subtitle}
            </p>
          </header>

          <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
            <div className="grid min-h-200 lg:grid-cols-[minmax(0,1fr)_340px]">
              {/* 좌측: 그룹 카드 (카드 늘면 세로로 함께 성장) */}
              <div className="flex flex-col gap-5 p-6 sm:p-8">
                {inlineError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {inlineError}
                  </div>
                )}

                {/* 정리 진행률 — 요약으로 통합, 숨김 처리(코드 유지) */}
                {SHOW_PROGRESS_STAT && (
                  <ProgressStat
                    label="정리 진행률"
                    value={progress.percent}
                    caption={`활성 카드 ${progress.activeCount}개 중 ${progress.doneCount}개 확인 완료`}
                    boxed
                  />
                )}

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

              {/* 우측: 요약 */}
              <aside className="flex flex-col border-t border-border bg-muted/20 p-6 sm:p-8 lg:border-l lg:border-t-0">
                <TripSummaryCard
                  {...summary}
                  bare
                  hideProgress
                  nextDisabled={nextDisabled}
                  onNext={() => {
                    posthog.capture('grouping_completed', { trip_id: tripId });
                    navigate(tripId ? `/arrange?tripId=${tripId}` : '/arrange');
                  }}
                  onPrev={handlePrev}
                />
              </aside>
            </div>
          </div>
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
        onSaveDisplay={async (payload) => {
          if (await handleSaveDisplay(reviewCard, payload)) {
            setReviewOpen(false);
          }
        }}
      />

      <SelectCardDetailPanel
        open={selectOpen}
        onOpenChange={(open) => {
          setSelectOpen(open);
          if (!open) setAwaitingSelectId(null);
        }}
        card={selectCard}
        mapContext={summary.destinations
          .filter((item) => item !== '-')
          .join(' ')}
        pending={busy || awaitingSelectId != null}
        error={state.phase === 'ready' ? state.errorMessage : null}
        onConfirm={async (payload) => {
          const cardId = selectCard?.id;
          if (await handleConfirmSelect(selectCard, payload)) {
            // 닫지 않고, 재파싱 후 후속 질문이 있으면 이어서 보여준다(위 effect).
            if (cardId) {
              setAwaitingSelectId(cardId);
              pollUntilCardSettled(cardId);
            } else {
              setSelectOpen(false);
            }
          }
        }}
        onExclude={async () => {
          if (await handleExclude(selectCard)) setSelectOpen(false);
        }}
        onSaveMemo={async (memo) => {
          await handleSaveMemo(selectCard, memo);
        }}
        onSaveDisplay={async (payload) => {
          if (await handleSaveDisplay(selectCard, payload)) {
            setSelectOpen(false);
          }
        }}
      />

      <EditCardDetailPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        card={editCard}
        onConfirm={(payload) => {
          // 비구조화(질문/입력) 카드 경로 — notes로 전송
          const notes = payload.answer.trim();
          if (!notes || !tripId || !editCard) return;
          runCardMutation(
            () => patchCard(tripId, editCard.id, { notes }),
            '확인 처리에 실패했습니다.'
          );
        }}
        onSaveMemo={async (memo) => {
          await handleSaveMemo(editCard, memo);
        }}
        onSaveDisplay={async (payload) => {
          if (await handleSaveDisplay(editCard, payload)) {
            setEditOpen(false);
          }
        }}
        onResolveByStructuredEdit={handleResolveByStructuredEdit}
        onResolveByNotes={handleResolveByNotesEdit}
        onSelectProcess={handleSelectProcessEdit}
        resolving={editResolving}
        resolveError={editResolveError}
      />

      <CardAddFlow
        open={cardAddFlowOpen}
        onOpenChange={setCardAddFlowOpen}
        tripId={tripId}
        destination={summary.destinations[0]}
        tripStartDate={tripDetailQuery.data?.start_date}
        travelDays={tripDetailQuery.data?.travel_days}
        savedActionLabel="정리 화면에서 확인하기"
        onManualSubmit={async (draft) => {
          if (!tripId) return;
          setCardAddFlowOpen(false);
          await runCardMutation(
            () => addCard(tripId, toCardAddRequest(draft)),
            '카드 추가에 실패했습니다.'
          );
        }}
        onAiCardsCreated={() => refresh()}
      />
    </PageTransition>
  );
};

export default GroupingPage;
