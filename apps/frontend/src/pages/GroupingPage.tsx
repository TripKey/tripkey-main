// GroupingPage (SCR-03 그룹화 '정보 정리하기' 페이지)

import { Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { GroupingViewModel, PlaceCardViewModel } from '@/types/grouping';

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
} from '../utils/grouping-mapper';
import { useOnboardingStore } from '../utils/onboarding-store';

const logStub = (action: string) => () => {
  console.log('[GroupingPage] stub action:', action);
};

const GroupingPage = () => {
  const [searchParams] = useSearchParams();
  const storeTripId = useOnboardingStore((s) => s.tripId);
  const tripId = searchParams.get('tripId') ?? storeTripId ?? '';

  const [viewModel, setViewModel] = useState<GroupingViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [reviewCard, setReviewCard] = useState<PlaceCardViewModel | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectCard, setSelectCard] = useState<PlaceCardViewModel | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [editCard, setEditCard] = useState<PlaceCardViewModel | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!tripId) {
      setErrorMessage(
        'tripId가 없습니다. /onboarding 으로 여행을 먼저 만들거나 URL에 ?tripId=… 를 추가하세요.'
      );
      setLoading(false);
      return;
    }
    setErrorMessage(null);
    try {
      const [groupsRes, cardsRes] = await Promise.all([
        fetchGroups03(tripId),
        fetchCards(tripId),
      ]);
      setViewModel(mapToGroupingViewModel(groupsRes, cardsRes));
    } catch (error) {
      const apiBody = parseGroupingApiError(error);
      setErrorMessage(
        apiBody?.message ??
          (error instanceof Error
            ? error.message
            : '서버 통신 오류가 발생했습니다.')
      );
    }
  }, [tripId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    refresh().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const runMutation = useCallback(
    async (action: () => Promise<unknown>, failMessage: string) => {
      if (busy || !tripId) return;
      setBusy(true);
      try {
        await action();
        await refresh();
      } catch (error) {
        const apiBody = parseGroupingApiError(error);
        alert(apiBody?.message ?? failMessage);
      } finally {
        setBusy(false);
      }
    },
    [busy, refresh, tripId]
  );

  const handleExclude = (card: PlaceCardViewModel | null) => {
    if (!card) return;
    runMutation(
      () => patchCard(tripId, card.id, { is_excluded: true }),
      '제외 처리에 실패했습니다.'
    );
  };

  const handleInclude = (card: PlaceCardViewModel | null) => {
    if (!card) return;
    runMutation(
      () => patchCard(tripId, card.id, { is_excluded: false }),
      '복원 처리에 실패했습니다.'
    );
  };

  const handleSaveMemo = (card: PlaceCardViewModel | null, memo: string) => {
    if (!card) return;
    runMutation(
      () => patchCard(tripId, card.id, { memo }),
      '메모 저장에 실패했습니다.'
    );
  };

  const handleConfirmSelect = (card: PlaceCardViewModel | null) => {
    if (!card) return;
    runMutation(
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

  const fallbackSummary = useMemo(
    () => ({
      destinations: [] as string[],
      dateRange: '-',
      nights: 0,
      days: 0,
      travelers: 0,
      totalCards: 0,
      cardStats: [],
      completionPct: 0,
    }),
    []
  );

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
  const summary = viewModel?.summary ?? fallbackSummary;

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
              onClick={() => refresh()}
              disabled={busy || loading}
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

            {errorMessage && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {errorMessage}
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
        onExclude={() => {
          handleExclude(reviewCard);
          setReviewOpen(false);
        }}
        onInclude={() => {
          handleInclude(reviewCard);
          setReviewOpen(false);
        }}
        onSaveMemo={(memo) => handleSaveMemo(reviewCard, memo)}
      />

      <SelectCardDetailPanel
        open={selectOpen}
        onOpenChange={setSelectOpen}
        card={selectCard}
        onConfirm={(payload) => {
          console.log('[GroupingPage] select payload', payload);
          handleConfirmSelect(selectCard);
          setSelectOpen(false);
        }}
        onExclude={() => {
          handleExclude(selectCard);
          setSelectOpen(false);
        }}
        onSaveMemo={(memo) => handleSaveMemo(selectCard, memo)}
      />

      <EditCardDetailPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        card={editCard}
        onConfirm={(payload) => {
          console.log('[GroupingPage] edit payload (미구현)', payload);
          alert('수정 재처리 API는 아직 연결되지 않았습니다.');
        }}
        onSaveMemo={(memo) => handleSaveMemo(editCard, memo)}
      />

      <AddCardModal
        open={addCardOpen}
        onOpenChange={setAddCardOpen}
        onSubmit={(draft) => {
          setAddCardOpen(false);
          runMutation(
            () => addCard(tripId, toCardAddRequest(draft)),
            '카드 추가에 실패했습니다.'
          );
        }}
      />
    </div>
  );
};

export default GroupingPage;
