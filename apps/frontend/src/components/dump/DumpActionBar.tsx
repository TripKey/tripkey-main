import Button from '../common/Button';
import './DumpActionBar.css';

type DumpActionBarProps = {
  onBack: () => void;
  onNext: () => void;
  isNextDisabled: boolean;
  errorMessage: string | null;
};

const DumpActionBar = ({
  onBack,
  onNext,
  isNextDisabled,
  errorMessage,
}: DumpActionBarProps) => {
  const nextGuideMessage = isNextDisabled
    ? '10자 입력시 활성화'
    : 'AI가 입력한 정보를 분석합니다';

  return (
    <div className="dump-action-bar">
      <Button variant="outlined" onClick={onBack}>
        이전
      </Button>

      <div className="dump-next-section">
        <p className="dump-action-message">{nextGuideMessage}</p>
        {errorMessage && <p className="dump-error-message">{errorMessage}</p>}

        <Button variant="filled" onClick={onNext} disabled={isNextDisabled}>
          다음
        </Button>
      </div>
    </div>
  );
};

export default DumpActionBar;
