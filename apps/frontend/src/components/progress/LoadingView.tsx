import StatusIcon from '../common/StatusIcon';
import StepIndicator from '../common/StepIndicator';
import { STEP_TEXTS } from '../../types/progress';

type LoadingViewProps = {
  step: 1 | 2 | 3;
};

const LoadingView = ({ step }: LoadingViewProps) => {
  return (
    <>
      <StatusIcon kind="logo" />
      <div className="progress-spinner" />
      <h2 className="progress-title">{STEP_TEXTS[step]}</h2>
      <StepIndicator current={step} />
      <p className="progress-caption">잠시만 기다려주세요...</p>
    </>
  );
};

export default LoadingView;
