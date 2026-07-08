// ScheduleCard — 우측 보드(Day 컬럼)에 배치된 일정 카드 한 장.
// fixedTime 이 있으면 "고정 시작 시간" 강조 카드(항공권 등), 없으면 일반 일정 카드.

import { Clock, X } from 'lucide-react';
import type { MouseEvent } from 'react';

import Spinner from '@/components/common/Spinner';
import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import { cn } from '@/lib/utils';
import type { ScheduledCardViewModel } from '@/types/arrange';
import type { PlaceCardAccent } from '@/types/grouping';

const ACCENT_BAR: Record<PlaceCardAccent, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-destructive',
  muted: 'bg-muted-foreground/30',
};

type ScheduleCardProps = ScheduledCardViewModel & {
  onClick?: () => void;
  onRemove?: () => void;
};

const ScheduleCard = ({
  name,
  accent = 'green',
  badges = [],
  fixedTime,
  timeLabel,
  processing = false,
  onClick,
  onRemove,
}: ScheduleCardProps) => {
  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onRemove?.();
  };

  // 고정 시작 시간 카드 — 옅은 primary 톤 박스
  if (fixedTime) {
    return (
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        className={cn(
          'rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-3',
          onClick && !processing && 'cursor-pointer hover:bg-primary/10',
          processing && 'opacity-40'
        )}
      >
        <p className="text-[11px] font-medium text-primary/80">
          고정 시작 시간
        </p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <span className="shrink-0 text-sm font-bold text-primary tabular-nums">
            {fixedTime}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={cn(
        'relative flex overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-shadow',
        onClick && !processing && 'cursor-pointer hover:shadow-sm'
      )}
    >
      <span aria-hidden="true" className={cn('w-1 shrink-0', ACCENT_BAR[accent])} />
      <div
        className={cn(
          'min-w-0 flex-1 px-3.5 py-3',
          processing && 'pointer-events-none select-none opacity-40'
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            {timeLabel && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                <Clock className="size-3.5" aria-hidden="true" />
                {timeLabel}
              </span>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={processing}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`${name} 배치 해제`}
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        {badges.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            {badges.map((badge, index) => (
              <PlaceCardBadge key={index} {...badge} />
            ))}
          </div>
        )}
      </div>
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/30">
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default ScheduleCard;
