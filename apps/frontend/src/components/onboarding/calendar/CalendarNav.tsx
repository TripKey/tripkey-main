import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { type MonthCaptionProps, useDayPicker } from 'react-day-picker';

export const CalendarNav = ({ calendarMonth }: MonthCaptionProps) => {
  const { previousMonth, nextMonth, goToMonth } = useDayPicker();

  return (
    <div className="calendar-nav">
      <button
        type="button"
        className="calendar-nav__btn"
        disabled={!previousMonth}
        onClick={() => previousMonth && goToMonth(previousMonth)}
      >
        ‹
      </button>
      <span className="calendar-nav__label">
        {format(calendarMonth.date, 'yyyy년 M월', { locale: ko })}
      </span>
      <button
        type="button"
        className="calendar-nav__btn"
        disabled={!nextMonth}
        onClick={() => nextMonth && goToMonth(nextMonth)}
      >
        ›
      </button>
    </div>
  );
};
