// DayTabs — 확정 화면(SCR-05) Day 1~N 탭. 우측에 지도 보기 버튼(탭과 동일 스타일).

import { cn } from '@/lib/utils';
import type { ConfirmDayViewModel } from '@/types/confirm';

type DayTabsProps = {
  days: Pick<ConfirmDayViewModel, 'id' | 'dayLabel'>[];
  activeIndex: number;
  onSelect: (index: number) => void;
  mapVisible: boolean;
  onToggleMap: () => void;
};

const DayTabs = ({
  days,
  activeIndex,
  onSelect,
  mapVisible,
  onToggleMap,
}: DayTabsProps) => {
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

      <button
        type="button"
        onClick={onToggleMap}
        aria-pressed={mapVisible}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm',
          mapVisible
            ? 'bg-foreground text-background'
            : 'bg-background text-muted-foreground ring-1 ring-foreground/10'
        )}
      >
        {mapVisible ? '지도 숨기기' : '지도 보기'}
      </button>
    </div>
  );
};

export default DayTabs;
