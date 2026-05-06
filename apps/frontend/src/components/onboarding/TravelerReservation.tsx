import { useState } from 'react';

import ToggleSwitch from '../common/ToggleSwitch';
import './TravelerReservation.css';

type TravelerReservationProps = {
  title: string;
};

const TravelerReservation = ({ title }: TravelerReservationProps) => {
  const [isFlightBooked, setIsFlightBooked] = useState(false);
  const [isAccomBooked, setIsAccomBooked] = useState(false);

  return (
    <section className="traveler-reservation">
      <h3 className="traveler-reservation__title">{title}</h3>

      <div className="traveler-reservation__row">
        <div className="traveler-reservation__info">
          <span className="traveler-reservation__label">항공편 예약 완료</span>
          <p className="traveler-reservation__hint">
            예약했다면 일정에 반영돼요
          </p>
        </div>
        <ToggleSwitch isChecked={isFlightBooked} onChange={setIsFlightBooked} />
      </div>

      <div className="traveler-reservation__row">
        <div className="traveler-reservation__info">
          <span className="traveler-reservation__label">숙소 예약 완료</span>
          <p className="traveler-reservation__hint">
            예약했다면 일정에 반영돼요
          </p>
        </div>
        <ToggleSwitch isChecked={isAccomBooked} onChange={setIsAccomBooked} />
      </div>
    </section>
  );
};

export default TravelerReservation;
