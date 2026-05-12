import { useNavigate } from 'react-router-dom';

import OnboardingForm from '../components/onboarding/OnboardingForm';
import TravelerCount from '../components/onboarding/TravelerCount';
import TravelerReservation from '../components/onboarding/TravelerReservation';
import TripSummary from '../components/summary/TripSummary';
import { useOnboardingStore } from '../utils/onboarding-store';
import './OnboardingPage.css';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { submitOnboarding } = useOnboardingStore((s) => s.actions);
  const form = useOnboardingStore((s) => s.form);
  const errorMessage = useOnboardingStore((s) => s.errorMessage);

  const handleNext = async () => {
    const success = await submitOnboarding();
    if (success) navigate('/dump');
  };

  return (
    <div className="onboarding-page">
      <main className="onboarding-page__main">
        <header className="onboarding-page__header">
          <h1 className="onboarding-page__title">여행 기본 정보</h1>
          <p className="onboarding-page__desc">
            어디로, 얼마나, 누구와 떠나나요
          </p>
        </header>

        <div className="onboarding-page__body">
          <section className="onboarding-page__card">
            <OnboardingForm
              title="여행 이름"
              name="tripName"
              placeholder="여행의 이름을 입력하세요"
              subtitle="여행을 구분할 수 있는 이름을 자유롭게 입력하세요."
            />
          </section>

          <section className="onboarding-page__card">
            <OnboardingForm
              title="여행 기간"
              name="tripDuration"
              placeholder="여행 기간을 입력하세요"
              subtitle="복수 선택 가능."
            />
          </section>

          <section className="onboarding-page__card onboarding-page__calendar">
            <h2 className="onboarding-page__section-title">여행 일정</h2>

            <div className="onboarding-page__date-toggle">
              <button type="button">정확한 날짜</button>
              <button type="button">유연한 날짜</button>
            </div>

            <div className="onboarding-page__calendar-area">캘린더 위치</div>
          </section>

          <section className="onboarding-page__card onboarding-page__traveler">
            <TravelerCount title="동행자 수" count={1} />
            <TravelerReservation title="여행 예약 상태" />
          </section>
        </div>
      </main>

      <aside className="onboarding-page__sidebar">
        <TripSummary
          items={[
            {
              icon: '✈️',
              label: '여행지',
              value: form.destinations.length > 0 ? form.destinations.join(', ') : '-',
            },
            {
              icon: '📅',
              label: '일정',
              value: '-',
            },
            {
              icon: '👥',
              label: '동행자',
              value: form.companion_count > 0 ? `${form.companion_count}명` : '-',
            },
            {
              icon: '👥',
              label: '예약완료',
              value: '-',
            },
          ]}
          onNext={handleNext}
          isNextDisabled={form.destinations.length === 0}
          errorMessage={errorMessage}
          stateMessage="여행지와 일정을 입력하면 다음 단계로 진행할 수 있어요"
        />
      </aside>
    </div>
  );
};

export default OnboardingPage;
