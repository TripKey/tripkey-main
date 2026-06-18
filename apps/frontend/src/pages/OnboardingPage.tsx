import { useNavigate } from 'react-router-dom';

import TripSummaryCard from '../components/grouping/TripSummaryCard';
import Header from '../components/header/Header';
import TripCalendar from '../components/onboarding/calendar/TripCalendar';
import OnboardingForm from '../components/onboarding/OnboardingForm';
import TravelerCount from '../components/onboarding/TravelerCount';
import TravelerReservation from '../components/onboarding/TravelerReservation';
import { Button } from '../components/ui/button';
import {
  useCalendarStore,
  formatDateRangeLabel,
} from '../utils/calendar-store';
import { useOnboardingStore } from '../utils/onboarding-store';
import './OnboardingPage.css';

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { submitOnboarding, resetForm } = useOnboardingStore((s) => s.actions);
  const errorMessage = useOnboardingStore((s) => s.errorMessage);

  const {
    tripName,
    destinations,
    companion_count,
    has_flight,
    has_accommodation,
  } = useOnboardingStore((s) => s.form);
  const setForm = useOnboardingStore((s) => s.actions.setForm);

  const { type, exactDate, flexDate } = useCalendarStore();
  const resetCalendar = useCalendarStore((s) => s.resetCalendar);

  const dateRange = formatDateRangeLabel(type, exactDate, flexDate);
  const nights = exactDate?.nights ?? flexDate?.nights ?? 0;

  const reservation = [has_flight && '항공편', has_accommodation && '숙소']
    .filter(Boolean)
    .join(', ');

  const hasDestination = destinations.length > 0;
  const hasSchedule = type !== null;
  const filledCount = [hasDestination, hasSchedule].filter(Boolean).length;
  const completionPct = (filledCount / 2) * 100;
  const remainingFields = 2 - filledCount;
  const progressValueLabel =
    remainingFields > 0 ? `${remainingFields}개 남음` : '준비 완료';

  const summary = {
    destinations: destinations.length ? destinations : ['-'],
    dateRange,
    nights,
    days: nights + 1,
    travelers: companion_count,
    reservation: reservation || undefined,
    completionPct,
  };

  const isNextDisabled = filledCount < 2;

  const handleNext = async () => {
    const success = await submitOnboarding();
    if (success) navigate('/dump');
  };

  const handleReset = () => {
    resetForm();
    resetCalendar();
  };

  return (
    <>
      <Header
        currentStepId="onboarding"
        showTripMeta={false}
        actions={
          <Button variant="outline" size="sm" onClick={handleReset}>
            초기화
          </Button>
        }
      />
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
                value={tripName}
                onChange={(v) => setForm({ tripName: v })}
              />
            </section>

            <section className="onboarding-page__card">
              <OnboardingForm
                title="여행지"
                placeholder="도시명을 검색하세요"
                subtitle="복수 선택 가능. 1개 이상 필수"
                type="destination"
              />
            </section>

            <section className="onboarding-page__card onboarding-page__calendar">
              <h2 className="onboarding-page__section-title">여행 일정</h2>

              <div className="onboarding-page__calendar-area">
                <TripCalendar />
              </div>
            </section>

            <section className="onboarding-page__card onboarding-page__traveler">
              <TravelerCount title="여행 인원" />
              <TravelerReservation title="여행 예약 상태" />
            </section>
          </div>
        </main>

        <aside className="onboarding-page__sidebar">
          <TripSummaryCard
            {...summary}
            onNext={handleNext}
            nextDisabled={isNextDisabled}
            progressLabel="입력 완료도"
            progressValueLabel={progressValueLabel}
            guideText="여행지와 일정을 입력하면 다음 단계로 진행할 수 있어요."
            errorMessage={errorMessage}
          />
        </aside>
      </div>
    </>
  );
};

export default OnboardingPage;
