import OnboardingForm from '../components/onboarding/OnboardingForm';
import TravelerCount from '../components/onboarding/TravelerCount';
import TravelerReservation from '../components/onboarding/TravelerReservation';
import TripSummary from '../components/summary/TripSummary';
import './OnboardingPage.css';

const OnboardingPage = () => {
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
              value: '-',
            },
            {
              icon: '📅',
              label: '일정',
              value: '-',
            },
            {
              icon: '👥',
              label: '동행자',
              value: '-',
            },
            {
              icon: '👥',
              label: '예약완료',
              value: '-',
            },
          ]}
        />
      </aside>
    </div>
  );
};

export default OnboardingPage;
