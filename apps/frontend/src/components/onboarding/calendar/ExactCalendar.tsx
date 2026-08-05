import { format, differenceInDays } from 'date-fns';
import { useEffect, useState } from 'react';
import { type DateRange, DayPicker } from 'react-day-picker';

import Callout from '@/components/common/Callout';
import {
  MAX_TRIP_DAYS,
  MAX_TRIP_NIGHTS,
  useCalendarStore,
} from '@/utils/calendar-store';
import { useOnboardingStore } from '@/utils/onboarding-store';

import { CalendarNav } from './CalendarNav';
import './ExactCalendar.css';

export const ExactCalendar = () => {
  const setExactDate = useCalendarStore((s) => s.setExactDate);
  const clearExactDate = useCalendarStore((s) => s.clearExactDate);
  const exactDate = useCalendarStore((s) => s.exactDate);
  const setForm = useOnboardingStore((s) => s.actions.setForm);

  const [range, setRange] = useState<DateRange>(() => ({
    from: exactDate?.from,
    to: exactDate?.to,
  }));
  const [showLimit, setShowLimit] = useState(false);

  useEffect(() => {
    if (exactDate === null) {
      setRange({ from: undefined, to: undefined });
      setShowLimit(false);
    }
  }, [exactDate]);

  const handleSelect = (newRange: DateRange | undefined) => {
    const from = newRange?.from;
    const to =
      newRange?.to?.getTime() === from?.getTime() ? undefined : newRange?.to;

    if (from && to) {
      const nights = differenceInDays(to, from);
      if (nights + 1 > MAX_TRIP_DAYS) {
        // 상한 초과: 반영하지 않고 방금 클릭한 날짜를 새 시작일로 두어 다시 고르게 함
        setShowLimit(true);
        setRange({ from: to, to: undefined });
        clearExactDate();
        setForm({ travel_days: 0 });
        return;
      }
      setShowLimit(false);
      setRange({ from, to });
      setExactDate({ from, to, nights });
      setForm({ travel_days: nights + 1 });
    } else {
      setShowLimit(false);
      setRange({ from, to });
      clearExactDate();
      setForm({ travel_days: 0 });
    }
  };

  const nights =
    range.from && range.to ? differenceInDays(range.to, range.from) : null;

  return (
    <>
      <DayPicker
        mode="range"
        selected={range}
        onSelect={handleSelect}
        disabled={{ before: new Date() }}
        components={{ MonthCaption: CalendarNav, Nav: () => <></> }}
      />
      <footer className="exact-calendar__footer">
        <div className="exact-calendar__footer-dates">
          <span>
            <p>출발일</p>
            {range.from ? format(range.from, 'M월d일') : '-'}
          </span>
          <span>
            <p>도착일</p>
            {range.to ? format(range.to, 'M월d일') : '-'}
          </span>
        </div>
        <div className="exact-calendar__footer-nights">
          {nights ? `${nights}박 ${nights + 1}일` : '-'}
        </div>
      </footer>
      {showLimit && (
        <Callout tone="warning" className="mt-2">
          최대 {MAX_TRIP_NIGHTS}박 {MAX_TRIP_DAYS}일까지 선택할 수 있어요.
        </Callout>
      )}
    </>
  );
};
