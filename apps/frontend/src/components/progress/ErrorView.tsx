import Button from '../common/Button';
import StatusIcon from '../common/StatusIcon';

type ErrorViewProps = {
  onRetry?: () => void;
};

const ErrorView = ({ onRetry }: ErrorViewProps) => {
  return (
    <>
      <StatusIcon kind="error" />
      <h2 className="progress-title">분석에 실패했어요</h2>
      <p className="progress-subtitle">다시 시도해주세요</p>
      <Button variant="filled" onClick={onRetry}>
        재시도
      </Button>
      <p className="progress-caption">재시도 시 SCR-02로 돌아갑니다</p>
    </>
  );
};

export default ErrorView;
