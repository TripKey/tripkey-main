import './FlexCalendar.css';
import { useState } from 'react';

import { useCalendarStore } from '@/utils/calendar-store';
import { useOnboardingStore } from '@/utils/onboarding-store';

const FlexCalendar = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [durationNights, setDurationNights] = useState(3);

  const setFlexDate = useCalendarStore((s) => s.setFlexDate);
  const setForm = useOnboardingStore((s) => s.actions.setForm);

  const currentYear = new Date().getFullYear();

  const isDisabledMonth = (month: number) => {
    return selectedYear === currentYear && month < new Date().getMonth() + 1;
  };

  const handleMonthClick = (month: number) => {
    setSelectedMonth(month);
    setFlexDate({ year: selectedYear, month, nights: durationNights });
    setForm({ travel_days: durationNights });
  };

  const handleDurationClick = (nights: number) => {
    setDurationNights(nights);

    if (selectedMonth) {
      setFlexDate({ year: selectedYear, month: selectedMonth, nights });
      setForm({ travel_days: nights });
    }
  };

  const durationOptions = [2, 3, 4, 5, 6, 7];

  return (
    <div className="flex-calendar">
      <div className="calendar-nav">
        <button
          type="button"
          className="calendar-nav__btn"
          disabled={selectedYear <= currentYear}
          onClick={() => setSelectedYear((y) => y - 1)}
        >
          ‹
        </button>
        <span className="calendar-nav__label">{selectedYear}년</span>
        <button
          type="button"
          className="calendar-nav__btn"
          onClick={() => setSelectedYear((y) => y + 1)}
        >
          ›
        </button>
      </div>

      <div className="flex-calendar__month-grid">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
          <button
            key={month}
            type="button"
            disabled={isDisabledMonth(month)}
            className={`flex-calendar__month-btn${selectedMonth === month ? ' flex-calendar__month-btn--active' : ''}${isDisabledMonth(month) ? ' flex-calendar__month-btn--disabled' : ''}`}
            onClick={() => handleMonthClick(month)}
          >
            {month}월
          </button>
        ))}
      </div>

      <p className="flex-calendar__label">며칠 동안 여행하시나요?</p>

      <div className="flex-calendar__duration">
        {durationOptions.map((nights) => (
          <button
            key={nights}
            type="button"
            className={`flex-calendar__duration-btn${durationNights === nights ? ' flex-calendar__duration-btn--active' : ''}`}
            onClick={() => handleDurationClick(nights)}
          >
            {nights}박 {nights + 1}일
          </button>
        ))}
      </div>
    </div>
  );
};

export default FlexCalendar;
