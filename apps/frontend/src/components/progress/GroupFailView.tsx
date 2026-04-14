import Button from '../common/Button';
import StatusIcon from '../common/StatusIcon';

type GroupFailViewProps = {
  onContinue?: () => void;
};

const GroupFailView = ({ onContinue }: GroupFailViewProps) => {
  return (
    <>
      <StatusIcon kind="info" />
      <h2 className="progress-title">장소는 찾았지만 그룹화에 실패했어요</h2>
      <p className="progress-subtitle">
        모든 장소가 미분류로 추가됩니다.
        <br />
        다음 화면에서 직접 정리할 수 있어요.
      </p>
      <Button variant="filled" onClick={onContinue}>
        그룹화 화면으로 이동
      </Button>
      <p className="progress-caption">전체 Unassigned 처리 후 SCR-03 진입</p>
    </>
  );
};

export default GroupFailView;
