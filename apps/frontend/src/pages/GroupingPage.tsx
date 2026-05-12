// GroupingPage (SCR-03 그룹화 '정보 정리하기' 페이지)

import { useState } from 'react';

import ProgressStat from '@/components/common/ProgressStat';
import ActionGroupSection from '@/components/grouping/ActionGroupSection';
import CardDetailPanel from '@/components/grouping/CardDetailPanel';
import EditCardDetailPanel from '@/components/grouping/EditCardDetailPanel';
import PlaceCard from '@/components/grouping/PlaceCard';
import SelectCardDetailPanel from '@/components/grouping/SelectCardDetailPanel';
import TripSummaryCard from '@/components/grouping/TripSummaryCard';
import Header from '@/components/header/Header';
import type { PlaceCardViewModel } from '@/types/grouping';

import { GROUPING_MOCK } from './GroupingPage.mock';

const logStub = (action: string) => () => {
  console.log('[GroupingPage] stub action:', action);
};

const GroupingPage = () => {
  const { heading, progress, groups, summary } = GROUPING_MOCK;

  const [reviewCard, setReviewCard] = useState<PlaceCardViewModel | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectCard, setSelectCard] = useState<PlaceCardViewModel | null>(null);
  const [selectOpen, setSelectOpen] = useState(false);
  const [editCard, setEditCard] = useState<PlaceCardViewModel | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-muted">
      <Header
        destination="오사카"
        extraDestinations={2}
        travelers={2}
        dateRange="5월 10일 ~ 5월 14일"
        onAddCard={logStub('add-card')}
        onAlertDemo={logStub('alert-demo')}
        onAlertMergedDemo={logStub('alert-merged-demo')}
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

            {/* 정리 진행률 카드 */}
            <ProgressStat
              label="정리 진행률"
              value={progress.percent}
              caption={`활성 카드 ${progress.activeCount}개 중 ${progress.doneCount}개 확인 완료`}
              boxed
            />

            {/* "해야 할 액션" */}
            {groups.map((group) => (
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
            ))}
          </div>

          {/*우측: 고정 사이드바(여행 요약)*/}
          <aside className="sticky top-34">
            <TripSummaryCard
              {...summary}
              onNext={logStub('next-step')}
              onPrev={logStub('prev-step')}
            />
          </aside>
        </div>
      </main>

      {/* "확인만 하면 되는 카드들"/ "제외된 항목" 상세보기 사이드 패널.*/}
      <CardDetailPanel
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        card={reviewCard}
        onExclude={() =>
          console.log(
            '[GroupingPage] stub action: exclude-card',
            reviewCard?.id
          )
        }
        onInclude={() =>
          console.log(
            '[GroupingPage] stub action: include-card',
            reviewCard?.id
          )
        }
        onSaveMemo={(memo) =>
          console.log(
            '[GroupingPage] stub action: save-memo',
            reviewCard?.id,
            memo
          )
        }
      />

      {/* "선택이 필요한 카드들"상세보기 사이드 패널.*/}
      <SelectCardDetailPanel
        open={selectOpen}
        onOpenChange={setSelectOpen}
        card={selectCard}
        onConfirm={(payload) =>
          console.log(
            '[GroupingPage] stub action: confirm-select',
            selectCard?.id,
            payload
          )
        }
        onExclude={() =>
          console.log(
            '[GroupingPage] stub action: exclude-card',
            selectCard?.id
          )
        }
        onSaveMemo={(memo) =>
          console.log(
            '[GroupingPage] stub action: save-memo',
            selectCard?.id,
            memo
          )
        }
      />

      {/* "수정이 필요한 카드들" 상세보기 사이드 패널*/}
      <EditCardDetailPanel
        open={editOpen}
        onOpenChange={setEditOpen}
        card={editCard}
        onConfirm={(payload) =>
          console.log(
            '[GroupingPage] stub action: confirm-edit',
            editCard?.id,
            payload
          )
        }
        onSaveMemo={(memo) =>
          console.log(
            '[GroupingPage] stub action: save-memo',
            editCard?.id,
            memo
          )
        }
      />
    </div>
  );
};

export default GroupingPage;
