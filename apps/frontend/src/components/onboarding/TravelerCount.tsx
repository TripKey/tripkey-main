import { useOnboardingStore } from '../../utils/onboarding-store';

import './TravelerCount.css';

type TravelerCountProps = {
  title: string;
};

const TravelerCount = ({ title }: TravelerCountProps) => {
  const companion_count = useOnboardingStore((s) => s.form.companion_count);
  const setForm = useOnboardingStore((s) => s.actions.setForm);
  const current = companion_count === 0 ? 1 : companion_count;

  const handleDecrement = () => {
    if (current <= 1) return;
    setForm({ companion_count: current - 1 });
  };

  const handleIncrement = () => {
    setForm({ companion_count: current + 1 });
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
