// DayColumn — 우측 칸반 보드의 Day 컬럼 한 개.
// 헤더(Day 라벨 + 날짜 + 카드 수) + 본문(배치된 카드들 또는 빈 드롭 플레이스홀더).
// 좌측 카드 목록에서 드래그한 카드를 여기에 드롭하면 onDropCard 로 전달된다(네이티브 HTML5 DnD).

import { Plus } from 'lucide-react';
import { useState, type DragEvent } from 'react';

import ScheduleCard from '@/components/arrange/ScheduleCard';
import { cn } from '@/lib/utils';
import type { DayColumnViewModel } from '@/types/arrange';

type DayColumnProps = DayColumnViewModel & {
  /** 카드를 이 Day에 드롭했을 때(드래그된 카드 id) */
  onDropCard?: (cardId: string) => void;
  /** 드래그가 진행 중이면 모든 컬럼을 드롭 가능 상태로 강조 */
  dragActive?: boolean;
};

const DayColumn = ({
  dayLabel,
  dateLabel,
  cards,
  onDropCard,
  dragActive = false,
}: DayColumnProps) => {
  const isEmpty = cards.length === 0;
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // drop 을 허용하려면 필수
    event.dataTransfer.dropEffect = 'move';
    if (!isOver) setIsOver(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    // 자식 요소로 이동할 때 발생하는 leave 는 무시(컬럼 밖으로 나갈 때만 해제)
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsOver(false);
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsOver(false);
    const cardId = event.dataTransfer.getData('text/plain');
    if (cardId) onDropCard?.(cardId);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex h-full w-[280px] shrink-0 flex-col rounded-2xl border border-border bg-background/60 p-3 transition-colors',
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
        <div className="mt-3 flex flex-1 flex-col gap-2.5 overflow-y-auto">
          {cards.map((card) => (
            <ScheduleCard key={card.id} {...card} />
          ))}
        </div>
      )}
    </div>
  );
};

export default DayColumn;
