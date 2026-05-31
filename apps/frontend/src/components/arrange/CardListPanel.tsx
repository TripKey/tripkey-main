// CardListPanel — 배치 화면 좌측 패널 전체.
// 헤더("카드 목록" + 재정렬 버튼 + 전체 카드 수) + 세로 스크롤되는 그룹 목록.
// 카드는 클릭 시 상세 패널이 열리고, 드래그하여 우측 Day 컬럼에 배치할 수 있다.

import { RefreshCw } from 'lucide-react';

import ArrangeCard from '@/components/arrange/ArrangeCard';
import CardGroupSection from '@/components/arrange/CardGroupSection';
import { Button } from '@/components/ui/button';
import type { ArrangeCardGroup, ArrangeCardViewModel } from '@/types/arrange';

type CardListPanelProps = {
  title: string;
  totalCards: number;
  groups: ArrangeCardGroup[];
  /** "재정렬" 클릭(동작은 depth) */
  onReorder?: () => void;
  /** 카드 클릭 — 우측 상세 패널 열기 */
  onSelectCard?: (card: ArrangeCardViewModel) => void;
  /** 카드 드래그 시작(배치 대상 강조용) */
  onDragCardStart?: (cardId: string) => void;
  /** 카드 드래그 종료 */
  onDragCardEnd?: () => void;
  /** 현재 드래그 중인 카드 id(흐림 처리용) */
  draggingCardId?: string | null;
};

const CardListPanel = ({
  title,
  totalCards,
  groups,
  onReorder,
  onSelectCard,
  onDragCardStart,
  onDragCardEnd,
  draggingCardId,
}: CardListPanelProps) => {
  // 카드가 모두 배치되어 비워진 그룹은 목록에서 숨긴다.
  const visibleGroups = groups.filter((group) => group.cards.length > 0);

  return (
    <div className="flex w-[380px] shrink-0 flex-col overflow-hidden rounded-2xl bg-muted/40 ring-1 ring-foreground/10">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onReorder}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            재정렬
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {totalCards}개
          </span>
        </div>
      </header>

      <div className="flex flex-col gap-3 overflow-y-auto px-3 py-3">
        {visibleGroups.map((group) => (
          <CardGroupSection
            key={group.id}
            title={group.title}
            count={group.cards.length}
            description={group.description}
          >
            {group.cards.map((card) => (
              <ArrangeCard
                key={card.id}
                {...card}
                onClick={() => onSelectCard?.(card)}
                onDragStart={() => onDragCardStart?.(card.id)}
                onDragEnd={onDragCardEnd}
                isDragging={draggingCardId === card.id}
              />
            ))}
          </CardGroupSection>
        ))}
      </div>
    </div>
  );
};

export default CardListPanel;
