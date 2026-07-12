// CardListPanel — 배치 화면 좌측 패널 전체.
// 헤더("카드 목록" + 재정렬 버튼 + 전체 카드 수) + 세로 스크롤되는 그룹 목록.
// 카드는 클릭 시 상세 패널이 열리고, 드래그하여 우측 Day 컬럼에 배치할 수 있다.
// Day 보드에서 드래그해 온 카드를 이 패널에 드롭하면 미배치 상태로 되돌린다.

import { RefreshCw } from 'lucide-react';
import { useState, type DragEvent } from 'react';

import ArrangeCard from '@/components/arrange/ArrangeCard';
import CardGroupSection from '@/components/arrange/CardGroupSection';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ArrangeCardGroup, ArrangeCardViewModel } from '@/types/arrange';
import { readArrangeDragData } from '@/utils/arrange-dnd';

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
  /** Day 보드에서 끌어온 카드를 좌측으로 되돌릴 때(미배치 복원) */
  onReturnCard?: (cardId: string) => void;
  /** 현재 드래그 중인 카드 id(흐림 처리용) */
  draggingCardId?: string | null;
  /** 이미 Day 보드에 배치된 카드 id 목록 */
  placedCardIds?: Set<string>;
  /** 드래그가 진행 중이면 패널을 드롭 가능 상태로 강조 */
  dragActive?: boolean;
};

const CardListPanel = ({
  title,
  totalCards,
  groups,
  onReorder,
  onSelectCard,
  onDragCardStart,
  onDragCardEnd,
  onReturnCard,
  draggingCardId,
  placedCardIds,
  dragActive = false,
}: CardListPanelProps) => {
  // 카드가 모두 배치되어 비워진 그룹은 목록에서 숨긴다.
  const visibleGroups = groups.filter((group) => group.cards.length > 0);
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // drop 허용
    event.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    const payload = readArrangeDragData(event.dataTransfer);
    // Day 보드에서 온 카드만 되돌린다(좌측 카드를 좌측에 드롭하면 무시).
    if (payload && payload.fromDayId !== null) onReturnCard?.(payload.cardId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex w-[380px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/40 transition-colors',
        dragActive && 'ring-primary/30',
        isOver && 'bg-primary/5 ring-2 ring-primary/40'
      )}
    >
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
                isPlaced={placedCardIds?.has(card.id) === true}
              />
            ))}
          </CardGroupSection>
        ))}
      </div>
    </div>
  );
};

export default CardListPanel;
