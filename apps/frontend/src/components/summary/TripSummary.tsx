import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import ActionBar from './ActionBar';
import './TripSummary.css';

type TripSummaryItem = {
  icon: string;
  label: string;
  value: ReactNode;
};

type TripSummaryProps = {
  items: TripSummaryItem[];
};

const TripSummary = ({ items }: TripSummaryProps) => {
  const navigate = useNavigate();

  const handleClickNext = () => {
    navigate('/dump');
  };

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
          onNext={handleClickNext}
          isNextDisabled={true}
          errorMessage={null}
          stateMessage="여행지와 일정을 입력하면 다음 단계로 진행할 수 있어요"
        />
      </div>
    </section>
  );
};

export default TripSummary;
