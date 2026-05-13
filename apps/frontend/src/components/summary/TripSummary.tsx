import { format } from 'date-fns';

import { useCalendarStore } from '@/utils/calendar-store';
import { useOnboardingStore } from '@/utils/onboarding-store';

import ActionBar from './ActionBar';
import ProgressBar from './ProgressBar';
import './TripSummary.css';

type TripSummaryItem = {
  icon: string;
  label: string;
  isNextDisabled?: boolean;
};

type TripSummaryProps = {
  items: TripSummaryItem[];
  onNext: () => void;
  errorMessage: string | null;
  stateMessage: string;
};

const TripSummary = ({
  items,
  onNext,
  errorMessage,
  stateMessage,
}: TripSummaryProps) => {
  const { type, exactDate, flexDate } = useCalendarStore();
  const { destinations, companion_count, has_flight, has_accommodation } =
    useOnboardingStore((s) => s.form);

  const destination = destinations.length > 0 ? destinations.join(', ') : '-';

  const schedule =
    type === 'exact' && exactDate
      ? `${format(exactDate.from, 'M월d일')} - ${format(exactDate.to, 'M월d일')} (${exactDate.nights}박 ${exactDate.nights + 1}일)`
      : type === 'flexible' && flexDate
        ? `${flexDate.year}년 ${flexDate.month}월 / ${flexDate.nights}박 ${flexDate.nights + 1}일`
        : '-';

  const companion = companion_count > 0 ? `${companion_count}명` : '-';

  const reservation =
    [has_flight && '항공편', has_accommodation && '숙소']
      .filter(Boolean)
      .join(', ') || '-';

  const display: Record<string, string> = {
    여행지: destination,
    일정: schedule,
    동행자: companion,
    예약완료: reservation,
  };

  const filled: Record<string, boolean> = {
    여행지: destinations.length > 0,
    일정: type !== null,
    동행자: companion_count > 0,
    예약완료: has_flight || has_accommodation,
  };

  const key = items.filter((i) => i.isNextDisabled);
  const doneCount = key.filter((i) => filled[i.label]).length;
  const isNextDisabled = key.some((i) => !filled[i.label]);

  return (
    <section className="trip-summary">
      <h2 className="trip-summary__header">여행 요약</h2>

      <ul className="trip-summary__list">
        {items.map((item) => (
          <li key={item.label}>
            <div className="trip-summary__icon">{item.icon}</div>

            <div className="trip-summary__content">
              <p className="trip-summary__label">{item.label}</p>
              <span className="trip-summary__value">
                {display[item.label] ?? '-'}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <div className="trip-summary__action">
        <ProgressBar
          percent={(doneCount / key.length) * 100}
          label={`${doneCount}/${key.length}`}
        />
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
