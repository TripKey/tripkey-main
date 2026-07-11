// DayColumn — 우측 칸반 보드의 Day 컬럼 한 개.
// 헤더(Day 라벨 + 날짜 + 카드 수) + 본문(배치된 카드들 또는 빈 드롭 플레이스홀더).
// 카드 드롭(좌측 목록/다른 Day → 이 Day) + 같은 Day 내 순서 재정렬을 모두 지원한다(네이티브 HTML5 DnD).
//  - 배치된 카드도 draggable: 다른 Day 로 옮기거나 좌측으로 되돌릴 수 있다(고정 시간 카드는 제외).
//  - 드롭 위치(마우스 Y)로 삽입 인덱스를 계산해 onDropCard 에 전달한다.

import { Plus } from 'lucide-react';
import { Fragment, useRef, useState, type DragEvent } from 'react';

import ScheduleCard from '@/components/arrange/ScheduleCard';
import { cn } from '@/lib/utils';
import type { DayColumnViewModel, ScheduledCardViewModel } from '@/types/arrange';
import {
  readArrangeDragData,
  setArrangeDragData,
  type ArrangeDragPayload,
} from '@/utils/arrange-dnd';

type DayColumnProps = DayColumnViewModel & {
  /** 카드를 이 Day에 드롭했을 때(드래그 payload + 삽입 인덱스) */
  onDropCard?: (payload: ArrangeDragPayload, targetIndex: number) => void;
  /** 배치된 카드 클릭 — 공통 상세 패널 열기 */
  onSelectCard?: (card: ScheduledCardViewModel) => void;
  /** 배치된 카드 X 클릭 — Day에서 제거 */
  onRemoveCard?: (cardId: string) => void;
  /** 배치된 카드 드래그 시작(하이라이트용) */
  onCardDragStart?: (cardId: string) => void;
  /** 배치된 카드 드래그 종료 */
  onCardDragEnd?: () => void;
  /** 현재 드래그 중인 카드 id(흐림 처리용) */
  draggingCardId?: string | null;
  /** 드래그가 진행 중이면 모든 컬럼을 드롭 가능 상태로 강조 */
  dragActive?: boolean;
};

// 카드 사이/끝의 삽입 위치 표시 선.
const DropIndicator = () => (
  <div className="mx-1 h-0.5 rounded-full bg-primary" aria-hidden="true" />
);

const DayColumn = ({
  id,
  dayLabel,
  dateLabel,
  cards,
  onDropCard,
  onSelectCard,
  onRemoveCard,
  onCardDragStart,
  onCardDragEnd,
  draggingCardId,
  dragActive = false,
}: DayColumnProps) => {
  const isEmpty = cards.length === 0;
  const [isOver, setIsOver] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 마우스 Y 위치 → 카드 사이 삽입 인덱스(각 카드의 세로 중앙 기준).
  const computeDropIndex = (clientY: number): number => {
    const container = listRef.current;
    if (!container) return cards.length;
    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-card-item]')
    );
    for (let i = 0; i < items.length; i += 1) {
      const rect = items[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return items.length;
  };

  const handleCardDragStart = (
    event: DragEvent<HTMLDivElement>,
    cardId: string
  ) => {
    setArrangeDragData(event.dataTransfer, { cardId, fromDayId: id });
    onCardDragStart?.(cardId);
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // drop 을 허용하려면 필수
    event.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
    setDropIndex(computeDropIndex(event.clientY));
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // 자식 요소로 이동할 때 발생하는 leave 는 무시(컬럼 밖으로 나갈 때만 해제)
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsOver(false);
      setDropIndex(null);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const targetIndex = computeDropIndex(event.clientY);
    setIsOver(false);
    setDropIndex(null);
    const payload = readArrangeDragData(event.dataTransfer);
    if (payload) onDropCard?.(payload, targetIndex);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-muted/40 p-3 transition-colors',
        dragActive && 'border-dashed border-primary/40',
        isOver &&
          'border-solid border-primary bg-primary/5 ring-2 ring-primary/30'
      )}
    >
      <header className="flex items-start justify-between gap-2 px-1">
        <div>
          <p className="text-sm font-bold text-foreground">{dayLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel}</p>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {cards.length}개
        </span>
      </header>

      {isEmpty ? (
        // 빈 컬럼 — 드롭 플레이스홀더
        <div
          className={cn(
            'mt-3 flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center transition-colors',
            isOver ? 'border-primary text-primary' : 'border-border'
          )}
        >
          <Plus
            className={cn(
              'size-5',
              isOver ? 'text-primary' : 'text-muted-foreground/50'
            )}
            aria-hidden="true"
          />
          <p
            className={cn(
              'text-xs',
              isOver ? 'text-primary' : 'text-muted-foreground/70'
            )}
          >
            카드를 여기에 드롭하세요
          </p>
        </div>
      ) : (
        <div
          ref={listRef}
          className="mt-3 flex flex-1 flex-col gap-2.5 overflow-y-auto"
        >
          {cards.map((card, index) => {
            // 고정 시작 시간 카드(항공권 등)는 이동 불가.
            const cardDraggable = !card.fixedTime && !card.processing;
            return (
              <Fragment key={card.id}>
                {isOver && dropIndex === index && <DropIndicator />}
                <div
                  data-card-item=""
                  draggable={cardDraggable}
                  onDragStart={(event) => handleCardDragStart(event, card.id)}
                  onDragEnd={onCardDragEnd}
                  className={cn(
                    cardDraggable && 'cursor-grab active:cursor-grabbing',
                    draggingCardId === card.id && 'opacity-40'
                  )}
                >
                  <ScheduleCard
                    {...card}
                    onClick={() => onSelectCard?.(card)}
                    onRemove={
                      cardDraggable ? () => onRemoveCard?.(card.id) : undefined
                    }
                  />
                </div>
              </Fragment>
            );
          })}
          {isOver && dropIndex === cards.length && <DropIndicator />}
        </div>
      )}
    </div>
  );
};

export default DayColumn;
