import Button from '../common/Button';
import './ActionBar.css';

type ActionBarProps = {
  onBack?: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
  errorMessage: string | null;
  stateMessage: string;
};

const ActionBar = ({
  onBack,
  onNext,
  isNextDisabled = true,
  errorMessage,
  stateMessage,
}: ActionBarProps) => {
  return (
    <div className="action-bar">
      {onBack && (
        <Button variant="outlined" onClick={onBack}>
          이전
        </Button>
      )}

      <div className="action-bar__next">
        <Button variant="filled" onClick={onNext} disabled={isNextDisabled}>
          다음 단계로
        </Button>
        {isNextDisabled && (
          <p className="action-bar__message">{stateMessage}</p>
        )}
        {errorMessage && <p className="action-bar__error">{errorMessage}</p>}
      </div>
    </div>
  );
};

export default ActionBar;
