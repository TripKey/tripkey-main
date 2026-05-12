import { ReactNode } from 'react';

import ActionBar from './ActionBar';
import './TripSummary.css';

type TripSummaryItem = {
  icon: string;
  label: string;
  value: ReactNode;
};

type TripSummaryProps = {
  items: TripSummaryItem[];
  onNext: () => void;
  isNextDisabled: boolean;
  errorMessage: string | null;
  stateMessage: string;
};

const TripSummary = ({ items, onNext, isNextDisabled, errorMessage, stateMessage }: TripSummaryProps) => {

  return (
    <section className="trip-summary">
      <h2 className="trip-summary__header">여행 요약</h2>

      <ul className="trip-summary__list">
        {items.map((item) => (
          <li key={item.label}>
            <div className="trip-summary__icon">{item.icon}</div>

            <div className="trip-summary__content">
              <p className="trip-summary__label">{item.label}</p>
              <span className="trip-summary__value">{item.value}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="trip-summary__action">
        <div>progress</div>
        <ActionBar
          onNext={onNext}
          isNextDisabled={isNextDisabled}
          errorMessage={errorMessage}
          stateMessage={stateMessage}
        />
      </div>
    </section>
  );
};

export default TripSummary;
