// ScheduleCard — 우측 보드(Day 컬럼)에 배치된 일정 카드 한 장.
// fixedTime 이 있으면 "고정 시작 시간" 강조 카드(항공권 등), 없으면 일반 일정 카드.

import { Clock } from 'lucide-react';

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

const ScheduleCard = ({
  name,
  accent = 'green',
  badges = [],
  fixedTime,
  timeLabel,
}: ScheduledCardViewModel) => {
  // 고정 시작 시간 카드 — 옅은 primary 톤 박스
  if (fixedTime) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 px-3.5 py-3">
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
    <div className="flex overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <span
        aria-hidden="true"
        className={cn('w-1 shrink-0', ACCENT_BAR[accent])}
      />
      <div className="min-w-0 flex-1 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          {timeLabel && (
            <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
              <Clock className="size-3.5" aria-hidden="true" />
              {timeLabel}
            </span>
          )}
        </div>
        {badges.length > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            {badges.map((badge, index) => (
              <PlaceCardBadge key={index} {...badge} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleCard;
