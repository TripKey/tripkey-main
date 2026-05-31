// ArrangePage (SCR-04 배치 '일정 배치' 페이지)
// 좌측 "카드 목록"(그룹별) + 우측 Day 칸반 보드 + 하단 푸터.
// 좌측 카드는 클릭하면 우측 상세 패널이 열리고, 드래그하여 Day 컬럼에 배치할 수 있다(목데이터).
// 동선 검증/다음 단계/API 연동은 depth(이후 작업).

import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { useState } from 'react';

import ArrangeCardDetailPanel from '@/components/arrange/ArrangeCardDetailPanel';
import CardListPanel from '@/components/arrange/CardListPanel';
import DayColumn from '@/components/arrange/DayColumn';
import AddCardModal, {
  type AddCardDraft,
} from '@/components/grouping/AddCardModal';
import Header from '@/components/header/Header';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ARRANGE_FIXTURE } from '@/dev-fixtures/arrange-fixture';
import type {
  ArrangeCardViewModel,
  ScheduledCardViewModel,
} from '@/types/arrange';
import type { PlaceCardBadgeSpec, PlaceCategory } from '@/types/grouping';

const logStub = (action: string) => () => {
  console.log('[ArrangePage] stub action:', action);
};

// 좌측 목록 카드 → Day 보드에 배치되는 일정 카드로 변환.
const toScheduledCard = (
  card: ArrangeCardViewModel
): ScheduledCardViewModel => ({
  id: card.id,
  name: card.name,
  accent: card.accent,
  badges: card.badges,
});

// 직접 추가한 카드가 모이는 좌측 그룹(첫 추가 시 생성).
const ADDED_GROUP_ID = 'added';

// AddCardModal 의 카테고리 → 카드 배지(PlaceCardBadge) 카테고리.
const ADD_CATEGORY_TO_BADGE: Partial<
  Record<AddCardDraft['category'], PlaceCategory>
> = {
  place: 'place',
  activity: 'activity',
  flight: 'transport',
  lodging: 'lodging',
  food: 'food',
};

// 모달 입력(draft) → 좌측 카드 목록에 올릴 ArrangeCard.
const draftToArrangeCard = (draft: AddCardDraft): ArrangeCardViewModel => {
  const category = ADD_CATEGORY_TO_BADGE[draft.category];
  const badges: PlaceCardBadgeSpec[] | undefined = category
    ? [{ kind: 'category', category }]
    : undefined;

  return {
    id: `added-${crypto.randomUUID()}`,
    name: draft.name,
    accent: 'green',
    badges,
    detail: {
      classification: '추가한 카드',
      placementStatus: '배치 가능',
      region: draft.region || undefined,
      durationLabel:
        draft.durationMin > 0 ? `약 ${draft.durationMin}분` : undefined,
      userIntent: draft.timeMemo || undefined,
      memo: draft.memo || undefined,
    },
  };
};

const ArrangePage = () => {
  const { summary, heading, cardListTitle } = ARRANGE_FIXTURE;

  // 배치에 따라 좌측 목록과 우측 보드가 함께 바뀌므로 상태로 보관(목데이터로 초기화).
  const [groups, setGroups] = useState(ARRANGE_FIXTURE.groups);
  const [days, setDays] = useState(ARRANGE_FIXTURE.days);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);

  const [detailCard, setDetailCard] = useState<ArrangeCardViewModel | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);
  const [addCardOpen, setAddCardOpen] = useState(false);

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

  // 카드를 좌측 목록에서 빼고 해당 Day 컬럼에 추가한다.
  const placeCardOnDay = (cardId: string, dayId: string) => {
    const card = groups
      .flatMap((group) => group.cards)
      .find((item) => item.id === cardId);
    if (!card) return;

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
  };

  // 모달에서 추가한 카드를 좌측 "추가한 카드" 그룹에 올린다(없으면 그룹 생성).
  const handleAddCard = (draft: AddCardDraft) => {
    const newCard = draftToArrangeCard(draft);
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
    setAddCardOpen(false);
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted">
      <Header
        currentStepId="arrange"
        destination={summary.destination}
        extraDestinations={summary.extraDestinations}
        travelers={summary.travelers}
        dateRange={summary.dateRange}
        actions={
          <Button size="sm" onClick={() => setAddCardOpen(true)}>
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
            <Button variant="outline" onClick={logStub('validate-route')}>
              동선 검증하기
            </Button>
            <Button onClick={logStub('next-step')}>다음 단계</Button>
          </div>
        </div>

        {/* 본문: 좌 카드 목록 + 우 칸반 보드 */}
        <div className="flex min-h-0 flex-1 gap-5 px-6 pb-5">
          <CardListPanel
            title={cardListTitle}
            totalCards={remainingCards}
            groups={groups}
            onReorder={logStub('reorder')}
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
      </main>

      {/* 하단 푸터 */}
      <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-border bg-background px-6 py-3">
        <Button variant="outline" onClick={logStub('prev-step')}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          이전 단계
        </Button>

        <div className="flex items-center gap-4">
          {unplacedCount > 0 && (
            <span className="text-sm text-muted-foreground">
              {unplacedCount}개 카드가 아직 배치되지 않았습니다
            </span>
          )}
          <Button onClick={logStub('confirm-itinerary')}>
            일정 확정하기
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
        onSaveMemo={(memo) => {
          logStub(`save-memo:${detailCard?.id}:${memo}`)();
          setDetailOpen(false);
        }}
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
