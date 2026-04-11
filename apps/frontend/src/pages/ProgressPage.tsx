import type { ProgressStatus } from '../types/progress';
import LoadingView from '../components/progress/LoadingView';
import ErrorView from '../components/progress/ErrorView';
import EmptyView from '../components/progress/EmptyView';
import GroupFailView from '../components/progress/GroupFailView';
import './ProgressPage.css';

type ProgressPageProps = {
  status: ProgressStatus;
  onRetry?: () => void;
  onGoBack?: () => void;
  onContinue?: () => void;
};

const ProgressPage = ({ status, onRetry, onGoBack, onContinue }: ProgressPageProps) => {
  return (
    <main className="progress-page">
      <div className="progress-content">
        {status.kind === 'loading' && <LoadingView step={status.step} />}
        {status.kind === 'parse-error' && <ErrorView onRetry={onRetry} />}
        {status.kind === 'empty-places' && <EmptyView onGoBack={onGoBack} />}
        {status.kind === 'group-error' && <GroupFailView onContinue={onContinue} />}
      </div>
    </main>
  );
};

export default ProgressPage;
