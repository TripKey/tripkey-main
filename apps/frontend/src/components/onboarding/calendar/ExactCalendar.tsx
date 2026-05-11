import { format, differenceInDays } from 'date-fns';
import { useState } from 'react';
import { type DateRange, DayPicker } from 'react-day-picker';

import { useCalendarStore } from '@/utils/calendar-store';

import { CalendarNav } from './CalendarNav';
import './ExactCalendar.css';

export const ExactCalendar = () => {
  const [range, setRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const setExactDate = useCalendarStore((s) => s.setExactDate);

  const handleSelect = (newRange: DateRange | undefined) => {
    const from = newRange?.from;
    const to =
      newRange?.to?.getTime() === from?.getTime() ? undefined : newRange?.to;

    setRange({ from, to });

    if (from && to) {
      const nights = differenceInDays(to, from);
      setExactDate({ from, to, nights });
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
    </>
  );
};
