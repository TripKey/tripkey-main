// SummaryStatBadge — 사이드바 "여행 요약" 안의 카드 상태 분포 배지

import { cn } from '@/lib/utils';
import type { SummaryStatTone } from '@/types/grouping';

const TONE_CLASS: Record<SummaryStatTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  select: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  edit: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300',
  done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
};

type SummaryStatBadgeProps = {
  label: string;
  count: number;
  tone?: SummaryStatTone;
};

const SummaryStatBadge = ({
  label,
  count,
  tone = 'neutral',
}: SummaryStatBadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
        TONE_CLASS[tone]
      )}
    >
      {label}
      <span className="tabular-nums">{count}</span>
    </span>
  );
};

export default SummaryStatBadge;
