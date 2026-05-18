import { useNavigate } from 'react-router-dom';

import DumpForm from '../components/dump/DumpForm';
import DumpGuideCard from '../components/dump/DumpGuideCard';
import TripSummaryCard from '../components/grouping/TripSummaryCard';
import {
  useCalendarStore,
  formatDateRangeLabel,
} from '../utils/calendar-store';
import { DUMP_TEXT } from '../utils/constants';
import { useDumpStore } from '../utils/dump-store';
import { useOnboardingStore } from '../utils/onboarding-store';

import './DumpPage.css';

const DumpPage = () => {
  const tripId = useOnboardingStore((s) => s.tripId);
  const { dumpText, requestStatus, actions } = useDumpStore();
  const { setDumpText, submitDump } = actions;

  const { destinations, companion_count } = useOnboardingStore((s) => s.form);
  const { type, exactDate, flexDate } = useCalendarStore();

  const dateRange = formatDateRangeLabel(type, exactDate, flexDate);
  const nights = exactDate?.nights ?? flexDate?.nights ?? 0;

  const dumpTextCount = dumpText.trim().length;

  const completionPct = Math.min(
    100,
    Math.round((dumpTextCount / DUMP_TEXT.MIN_LENGTH) * 100)
  );

  const isNextDisabled =
    dumpTextCount < DUMP_TEXT.MIN_LENGTH || requestStatus === 'loading';

  const handleDumpTextChange = (nextDumpText: string) => {
    setDumpText(nextDumpText);
  };

  const navigate = useNavigate();

  const handleClickBack = () => {
    navigate('/onboarding');
  };

  const handleClickNext = async () => {
    if (!tripId) {
      navigate('/onboarding');
      return;
    }

    navigate('/progress');

    const isSuccess = await submitDump(tripId);

    if (!isSuccess) {
      navigate('/dump');
    }
  };

  return (
    <main className="dump-page">
      <section className="dump-container">
        <div className="dump-header">
          <h1>여행 정보 입력</h1>
          <p>가고 싶은 곳, 하고 싶은 것, 떠오르는 생각을 자유롭게 적어주세요</p>
        </div>

        <DumpGuideCard />

        <DumpForm
          dumpText={dumpText}
          dumpTextCount={dumpTextCount}
          onTextChange={handleDumpTextChange}
        />
      </section>

      <aside className="dump-sidebar">
        <TripSummaryCard
          destinations={destinations.length ? destinations : ['-']}
          dateRange={dateRange}
          nights={nights}
          days={nights + 1}
          travelers={companion_count}
          completionPct={completionPct}
          onNext={handleClickNext}
          onPrev={handleClickBack}
          nextDisabled={isNextDisabled}
        />
      </aside>
    </main>
  );
};

export default DumpPage;
