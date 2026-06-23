import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import DumpForm from '../components/dump/DumpForm';
import DumpGuideCard from '../components/dump/DumpGuideCard';
import DumpInputGuide from '../components/dump/DumpInputGuide';
import TripSummaryCard from '../components/grouping/TripSummaryCard';
import Header from '../components/header/Header';
import EmptyView from '../components/progress/EmptyView';
import ErrorView from '../components/progress/ErrorView';
import GroupFailView from '../components/progress/GroupFailView';
import LoadingView from '../components/progress/LoadingView';
import { Button } from '../components/ui/button';
import { useParseJobStatus } from '../hooks/useParseJobStatus';
import {
  useCalendarStore,
  formatDateRangeLabel,
} from '../utils/calendar-store';
import { DUMP_TEXT } from '../utils/constants';
import { useDumpStore } from '../utils/dump-store';
import { useOnboardingStore } from '../utils/onboarding-store';

import './DumpPage.css';
import './ProgressPage.css';

const DumpPage = () => {
  const navigate = useNavigate();
  const tripId = useOnboardingStore((s) => s.tripId);
  const { destinations, companion_count } = useOnboardingStore((s) => s.form);
  const { type, exactDate, flexDate } = useCalendarStore();
  const { dumpText, requestStatus, errorMessage, jobId, actions } =
    useDumpStore();
  const { setDumpText, submitDump, clearJob, resetDump } = actions;

  const view = useParseJobStatus(tripId, jobId);

  useEffect(() => {
    if (view.kind === 'done') {
      clearJob();
      navigate('/grouping', { replace: true });
    }
  }, [view.kind, navigate, clearJob]);

  const dateRange = formatDateRangeLabel(type, exactDate, flexDate);
  const nights = exactDate?.nights ?? flexDate?.nights ?? 0;

  const dumpTextCount = dumpText.trim().length;

  const completionPct = Math.min(
    100,
    Math.round((dumpTextCount / DUMP_TEXT.MIN_LENGTH) * 100)
  );

  const remainingChars = Math.max(0, DUMP_TEXT.MIN_LENGTH - dumpTextCount);
  const progressValueLabel =
    remainingChars > 0 ? `${remainingChars}자 남음` : '준비 완료';

  const summary = {
    destinations: destinations.length ? destinations : ['-'],
    dateRange,
    nights,
    days: nights + 1,
    travelers: companion_count,
    completionPct,
  };

  const isNextDisabled =
    dumpTextCount < DUMP_TEXT.MIN_LENGTH || requestStatus === 'loading';

  const handleDumpTextChange = (nextDumpText: string) => {
    setDumpText(nextDumpText);
  };

  const handleClickBack = () => {
    navigate('/onboarding');
  };

  const handleClickNext = async () => {
    if (!tripId) return;
    await submitDump(tripId);
  };

  const handleReset = () => {
    resetDump();
  };

  const isInProgress =
    jobId !== null && view.kind !== 'idle' && view.kind !== 'done';

  if (isInProgress) {
    return (
      <main className="dump-page dump-page--progress">
        <div className="progress-content">
          {view.kind === 'loading' && <LoadingView step={view.step} />}
          {view.kind === 'parse-error' && (
            <ErrorView onRetry={() => clearJob()} />
          )}
          {view.kind === 'empty-places' && (
            <EmptyView onGoBack={() => clearJob()} />
          )}
          {view.kind === 'group-error' && (
            <GroupFailView
              onContinue={() => navigate('/grouping', { replace: true })}
            />
          )}
        </div>
      </main>
    );
  }

  return (
    <>
      <Header
        currentStepId="dump"
        destination={summary.destinations[0] ?? '여행'}
        extraDestinations={Math.max(summary.destinations.length - 1, 0)}
        travelers={summary.travelers}
        dateRange={summary.dateRange}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={handleReset}>
              초기화
            </Button>
          </>
        }
      />
      <main className="dump-page">
        <section className="dump-container">
          <div className="dump-header">
            <h1>여행 정보 입력</h1>
            <p>
              가고 싶은 곳, 하고 싶은 것, 떠오르는 생각을 자유롭게 적어주세요
            </p>
          </div>

          <DumpGuideCard />

          <DumpForm
            dumpText={dumpText}
            dumpTextCount={dumpTextCount}
            onTextChange={handleDumpTextChange}
          />

          <DumpInputGuide />
        </section>

        <aside className="dump-sidebar">
          <TripSummaryCard
            {...summary}
            onNext={handleClickNext}
            onPrev={handleClickBack}
            nextDisabled={isNextDisabled}
            progressLabel="입력 완료도"
            progressValueLabel={progressValueLabel}
            guideText="여행 정보를 10자 이상 입력하면 다음 단계로 진행할 수 있어요."
            errorMessage={errorMessage}
          />
        </aside>
      </main>
    </>
  );
};

export default DumpPage;
