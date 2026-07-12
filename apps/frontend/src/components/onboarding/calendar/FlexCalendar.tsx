import './FlexCalendar.css';
import { useEffect, useState } from 'react';

import { useCalendarStore } from '@/utils/calendar-store';
import { useOnboardingStore } from '@/utils/onboarding-store';

const FlexCalendar = () => {
  const flexDate = useCalendarStore((s) => s.flexDate);
  const setFlexDate = useCalendarStore((s) => s.setFlexDate);
  const setForm = useOnboardingStore((s) => s.actions.setForm);

  const [selectedYear, setSelectedYear] = useState(
    flexDate?.year ?? new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    flexDate?.month ?? null
  );
  const [durationNights, setDurationNights] = useState<number | null>(
    flexDate?.nights ?? null
  );

  const durationOptions = [1, 2, 3, 4];
  const MIN_NIGHTS = 1;
  const MAX_NIGHTS = 30;

  const [showCustom, setShowCustom] = useState(
    flexDate?.nights != null && !durationOptions.includes(flexDate.nights)
  );

  useEffect(() => {
    if (flexDate === null) {
      setSelectedYear(new Date().getFullYear());
      setSelectedMonth(null);
      setDurationNights(null);
      setShowCustom(false);
    }
  }, [flexDate]);

  const currentYear = new Date().getFullYear();

  const isDisabledMonth = (month: number) => {
    return selectedYear === currentYear && month < new Date().getMonth() + 1;
  };

  const handleMonthClick = (month: number) => {
    setSelectedMonth(month);
    if (durationNights !== null) {
      setFlexDate({ year: selectedYear, month, nights: durationNights });
      setForm({ travel_days: durationNights + 1 });
    }
  };

  const handleDurationClick = (nights: number) => {
    setDurationNights(nights);

    if (selectedMonth) {
      setFlexDate({ year: selectedYear, month: selectedMonth, nights });
      setForm({ travel_days: nights + 1 });
    }
  };

  const handlePresetClick = (nights: number) => {
    setShowCustom(false);
    handleDurationClick(nights);
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    if (durationNights === null || durationOptions.includes(durationNights)) {
      handleDurationClick(8);
    }
  };

  const handleCustomStep = (delta: number) => {
    const base = durationNights ?? MIN_NIGHTS;
    const next = Math.min(MAX_NIGHTS, Math.max(MIN_NIGHTS, base + delta));
    handleDurationClick(next);
  };

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
            className={`flex-calendar__duration-btn${!showCustom && durationNights === nights ? ' flex-calendar__duration-btn--active' : ''}`}
            onClick={() => handlePresetClick(nights)}
          >
            {nights}박 {nights + 1}일
          </button>
        ))}
        {showCustom ? (
          <div className="flex-calendar__duration-btn flex-calendar__duration-btn--active flex-calendar__custom">
            <button
              type="button"
              className="flex-calendar__custom-step"
              disabled={(durationNights ?? MIN_NIGHTS) <= MIN_NIGHTS}
              onClick={() => handleCustomStep(-1)}
              aria-label="박수 줄이기"
            >
              −
            </button>
            <span className="flex-calendar__custom-value">
              {durationNights ?? MIN_NIGHTS}박 {(durationNights ?? MIN_NIGHTS) + 1}일
            </span>
            <button
              type="button"
              className="flex-calendar__custom-step"
              disabled={(durationNights ?? MIN_NIGHTS) >= MAX_NIGHTS}
              onClick={() => handleCustomStep(1)}
              aria-label="박수 늘리기"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="flex-calendar__duration-btn"
            onClick={handleCustomToggle}
          >
            직접 입력
          </button>
        )}
      </div>
    </div>
  );
};

export default FlexCalendar;
