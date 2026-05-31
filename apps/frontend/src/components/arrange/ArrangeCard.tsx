// ArrangeCard — 배치 화면(SCR-04) 좌측 "카드 목록"의 카드 한 장.
// 정리 화면의 PlaceCard 와 같은 액센트 바 + PlaceCardBadge 를 재사용한다.
// - 클릭: 우측 상세 패널(ArrangeCardDetailPanel) 열기
// - 드래그: Day 컬럼으로 끌어다 배치(네이티브 HTML5 DnD). 고정 카드(항공권, draggable=false)는 드래그 불가.

import { GripVertical, RefreshCw } from 'lucide-react';
import type { DragEvent } from 'react';

import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import { cn } from '@/lib/utils';
import type { ArrangeCardViewModel } from '@/types/arrange';
import type { PlaceCardAccent } from '@/types/grouping';

const ACCENT_BAR: Record<PlaceCardAccent, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-destructive',
  muted: 'bg-muted-foreground/30',
};

type ArrangeCardProps = ArrangeCardViewModel & {
  /** 카드 클릭 — 우측 상세 패널 열기 */
  onClick?: () => void;
  /** 드래그 시작(배치 대상 강조용) */
  onDragStart?: () => void;
  /** 드래그 종료 */
  onDragEnd?: () => void;
  /** 드래그 중인 카드면 살짝 흐리게 */
  isDragging?: boolean;
};

const ArrangeCard = ({
  id,
  name,
  accent = 'green',
  badges = [],
  draggable = true,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: ArrangeCardProps) => {
  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    // Day 컬럼 드롭 핸들러가 읽을 카드 식별자. (Firefox 는 setData 가 있어야 드래그가 시작됨)
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart?.();
  };

  return (
    <button
      type="button"
      draggable={draggable}
      onClick={onClick}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'flex w-full overflow-hidden rounded-xl bg-card text-left ring-1 ring-foreground/10 transition-shadow hover:shadow-sm',
        draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
    >
      {/* 좌측 컬러 액센트 바 */}
      <span
        aria-hidden="true"
        className={cn('w-1 shrink-0', ACCENT_BAR[accent])}
      />

      <div className="flex min-w-0 flex-1 items-center gap-3 px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          {badges.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              {badges.map((badge, index) => (
                <PlaceCardBadge key={index} {...badge} />
              ))}
            </div>
          )}
        </div>

        {draggable ? (
          // 드래그 어포던스(그립). 카드 전체가 draggable 이라 시각적 힌트 역할.
          <GripVertical
            className="size-4 shrink-0 text-muted-foreground/50"
            aria-hidden="true"
          />
        ) : (
          // 고정 카드(항공권): "이동" 힌트 — 드래그 불가, Day에 고정
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
            <RefreshCw className="size-3" aria-hidden="true" />
            이동
          </span>
        )}
      </div>
    </button>
  );
};

export default ArrangeCard;
