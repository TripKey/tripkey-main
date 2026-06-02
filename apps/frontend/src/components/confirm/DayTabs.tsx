// DayTabs — 확정 화면(SCR-05) Day 1~N 탭. 우측에 지도 보기 버튼(탭과 동일 스타일).

import type { ConfirmDayViewModel } from '@/dev-fixtures/confirm-mock';
import { cn } from '@/lib/utils';

type DayTabsProps = {
  days: Pick<ConfirmDayViewModel, 'id' | 'dayLabel'>[];
  activeIndex: number;
  onSelect: (index: number) => void;
};

const DayTabs = ({ days, activeIndex, onSelect }: DayTabsProps) => {
  return (
    <div className="flex items-center justify-between gap-2">
      <div role="tablist" className="flex items-center gap-2">
        {days.map((day, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(index)}
              className={cn(
                'rounded-full px-4 py-1.5 text-sm',
                active
                  ? 'bg-foreground text-background'
                  : 'bg-background text-muted-foreground ring-1 ring-foreground/10'
              )}
            >
              {day.dayLabel}
            </button>
          );
        })}
      </div>

      {/* 지도 보기 — Day 탭과 동일 pill 스타일. 동작은 추후 연결 */}
      <button
        type="button"
        className="rounded-full bg-background px-4 py-1.5 text-sm text-muted-foreground ring-1 ring-foreground/10"
      >
        지도 보기
      </button>
    </div>
  );
};

export default DayTabs;
