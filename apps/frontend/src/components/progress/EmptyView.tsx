import StatusIcon from '../common/StatusIcon';
import Button from '../common/Button';

type EmptyViewProps = {
  onGoBack?: () => void;
};

const EmptyView = ({ onGoBack }: EmptyViewProps) => {
  return (
    <>
      <StatusIcon kind="warning" />
      <h2 className="progress-title">장소를 찾지 못했어요</h2>
      <p className="progress-subtitle">장소명을 포함해서 다시 적어주세요</p>
      <Button variant="outlined" onClick={onGoBack}>
        입력 화면으로 돌아가기
      </Button>
      <p className="progress-caption">SCR-02로 복귀합니다</p>
    </>
  );
};

export default EmptyView;
