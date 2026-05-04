import { useState } from 'react';

import './TravelerCount.css';

type TravelerCountProps = {
  title: string;
  count: number;
  onCountChange?: (count: number) => void;
};

const TravelerCount = ({ title, count, onCountChange }: TravelerCountProps) => {
  const [current, setCurrent] = useState(count);

  const handleDecrement = () => {
    if (current <= 1) return;
    const next = current - 1;
    setCurrent(next);
    onCountChange?.(next);
  };

  const handleIncrement = () => {
    const next = current + 1;
    setCurrent(next);
    onCountChange?.(next);
  };

  return (
    <section className="traveler-count">
      <h2 className="traveler-count__title">{title}</h2>

      <div className="traveler-count__counter">
        <button
          type="button"
          className="traveler-count__btn"
          onClick={handleDecrement}
          disabled={current <= 1}
        >
          -
        </button>

        <input
          type="number"
          name="travelers-count"
          value={current}
          readOnly
          className="traveler-count__input"
        />
        <span className="traveler-count__unit">명</span>

        <button
          type="button"
          className="traveler-count__btn"
          onClick={handleIncrement}
        >
          +
        </button>
      </div>

      <p className="traveler-count__hint">
        {current}명이 함께 여행을 떠납니다.
      </p>
    </section>
  );
};

export default TravelerCount;
