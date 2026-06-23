import { useOnboardingStore } from '../../utils/onboarding-store';
import ToggleSwitch from '../common/ToggleSwitch';
import './TravelerReservation.css';

type TravelerReservationProps = {
  title: string;
};

const TravelerReservation = ({ title }: TravelerReservationProps) => {
  const has_flight = useOnboardingStore((s) => s.form.has_flight);
  const has_accommodation = useOnboardingStore((s) => s.form.has_accommodation);
  const setForm = useOnboardingStore((s) => s.actions.setForm);

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
        <ToggleSwitch
          isChecked={has_flight}
          onChange={(checked) => setForm({ has_flight: checked })}
        />
      </div>

      <div className="traveler-reservation__row">
        <div className="traveler-reservation__info">
          <span className="traveler-reservation__label">숙소 예약 완료</span>
          <p className="traveler-reservation__hint">
            예약했다면 일정에 반영돼요
          </p>
        </div>
        <ToggleSwitch
          isChecked={has_accommodation}
          onChange={(checked) => setForm({ has_accommodation: checked })}
        />
      </div>
    </section>
  );
};

export default TravelerReservation;
