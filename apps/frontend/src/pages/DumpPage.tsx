import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import DumpForm from '../components/dump/DumpForm';
import DumpGuideCard from '../components/dump/DumpGuideCard';
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
  const { dumpText, requestStatus, jobId, actions } = useDumpStore();
  const { setDumpText, submitDump, clearJob } = actions;

  const view = useParseJobStatus(tripId, jobId);

  useEffect(() => {
    if (view.kind === 'done') {
      // dump 페이지를 history에 남기지 않아 뒤로가기로 폴링이 재시작되는 것을 막는다.
      navigate('/grouping', { replace: true });
    }
  }, [view.kind, navigate]);

  useEffect(() => {
    // 정상 흐름: tripId 없이 진입하면 온보딩부터 진행하도록 되돌린다.
    if (!tripId) {
      navigate('/onboarding', { replace: true });
    }
  }, [tripId, navigate]);

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

  const handleClickBack = () => {
    navigate('/onboarding');
  };

  const handleClickNext = async () => {
    if (!tripId) return;
    await submitDump(tripId);
  };

  // 온보딩으로 리다이렉트되는 동안 폼이 깜빡이지 않도록 렌더를 막는다.
  if (!tripId) {
    return null;
  }

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
        actions={
          <>
            <Button variant="outline" size="sm">
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
    </>
  );
};

export default DumpPage;
