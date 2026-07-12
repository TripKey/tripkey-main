// ArrangeCard — 배치 화면(SCR-04) 좌측 "카드 목록"의 카드 한 장.
// 정리 화면의 PlaceCard 와 같은 액센트 바 + PlaceCardBadge 를 재사용한다.
// - 클릭: 우측 공통 상세 패널(CardDetailPanel) 열기
// - 드래그: Day 컬럼으로 끌어다 배치(네이티브 HTML5 DnD). 고정 카드(항공권, draggable=false)는 드래그 불가.

import { GripVertical, RefreshCw } from 'lucide-react';
import type { DragEvent } from 'react';

import Spinner from '@/components/common/Spinner';
import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import { cn } from '@/lib/utils';
import type { ArrangeCardViewModel } from '@/types/arrange';
import type { PlaceCardAccent } from '@/types/grouping';
import { setArrangeDragData } from '@/utils/arrange-dnd';

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
  /** 이미 Day에 올라간 카드면 stock에서 흐리게 표시 */
  isPlaced?: boolean;
};

const ArrangeCard = ({
  id,
  name,
  accent = 'green',
  badges = [],
  draggable = true,
  processing = false,
  onClick,
  onDragStart,
  onDragEnd,
  isDragging = false,
  isPlaced = false,
}: ArrangeCardProps) => {
  const visibleBadges = isPlaced && !badges.some(
    (badge) => badge.kind === 'status' && badge.label === '배치됨'
  )
    ? [...badges, { kind: 'status' as const, label: '배치됨', tone: 'pending' as const }]
    : badges;
  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    if (processing) {
      event.preventDefault();
      return;
    }
    // Day 컬럼 드롭 핸들러가 읽을 카드 식별자 + 출처(좌측 목록 = fromDayId:null).
    // (Firefox 는 setData 가 있어야 드래그가 시작됨)
    setArrangeDragData(event.dataTransfer, { cardId: id, fromDayId: null });
    onDragStart?.();
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <button
        type="button"
        draggable={draggable && !processing}
        onClick={processing ? undefined : onClick}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
        className={cn(
          'flex w-full overflow-hidden text-left transition-shadow hover:shadow-sm',
          draggable && !processing && 'cursor-grab active:cursor-grabbing',
          isPlaced && 'opacity-55',
          isDragging && 'opacity-40',
          processing && 'pointer-events-none select-none opacity-40'
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
            {visibleBadges.length > 0 && (
              <div className="mt-1 flex items-center gap-1.5">
                {visibleBadges.map((badge, index) => (
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
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/30">
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default ArrangeCard;
