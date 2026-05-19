import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import DumpActionBar from '../components/dump/DumpActionBar';
import DumpForm from '../components/dump/DumpForm';
import DumpGuideCard from '../components/dump/DumpGuideCard';
import EmptyView from '../components/progress/EmptyView';
import ErrorView from '../components/progress/ErrorView';
import GroupFailView from '../components/progress/GroupFailView';
import LoadingView from '../components/progress/LoadingView';
import { useParseJobStatus } from '../hooks/useParseJobStatus';
import { DUMP_TEXT } from '../utils/constants';
import { useDumpStore } from '../utils/dump-store';
import { useOnboardingStore } from '../utils/onboarding-store';

import './DumpPage.css';
import './ProgressPage.css';

const TRIP_ID_MISSING_MESSAGE =
  '여행 정보가 없습니다. 온보딩에서 여행을 먼저 만들어 주세요.';

const DumpPage = () => {
  const navigate = useNavigate();
  const tripId = useOnboardingStore((s) => s.tripId);
  const { dumpText, requestStatus, errorMessage, jobId, actions } =
    useDumpStore();
  const { setDumpText, submitDump, clearJob } = actions;

  const view = useParseJobStatus(tripId, jobId);

  useEffect(() => {
    if (view.kind === 'done') {
      // dump 페이지를 history에 남기지 않아 뒤로가기로 폴링이 재시작되는 것을 막는다.
      navigate('/grouping', { replace: true });
    }
  }, [view.kind, navigate]);

  const dumpTextCount = dumpText.trim().length;

  const isNextDisabled =
    !tripId ||
    dumpTextCount < DUMP_TEXT.MIN_LENGTH ||
    requestStatus === 'loading';

  const handleDumpTextChange = (nextDumpText: string) => {
    setDumpText(nextDumpText);
  };

  const handleClickBack = () => {
    navigate('/');
  };

  const handleClickNext = async () => {
    if (!tripId) return;
    await submitDump(tripId);
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

  const actionBarError = !tripId ? TRIP_ID_MISSING_MESSAGE : errorMessage;

  return (
    <main className="dump-page">
      <div className="area">{/* 공통 컴포넌트 순서도 */}</div>

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

        <DumpActionBar
          onBack={handleClickBack}
          onNext={handleClickNext}
          isNextDisabled={isNextDisabled}
          errorMessage={actionBarError}
        />
      </section>
    </main>
  );
};

export default DumpPage;
