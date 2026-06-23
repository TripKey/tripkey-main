import './StepIndicator.css';

type StepIndicatorProps = {
  current: 1 | 2 | 3;
  total?: number;
};

const StepIndicator = ({ current, total = 3 }: StepIndicatorProps) => {
  return (
    <div className="step-indicator">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`step-dot ${i + 1 === current ? 'step-dot-active' : ''}`}
        />
      ))}
    </div>
  );
};

export default StepIndicator;
