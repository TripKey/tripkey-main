import { DUMP_TEXT } from '../../utils/constants';

import './DumpForm.css';

type DumpFormProps = {
  dumpText: string;
  dumpTextCount: number;
  onTextChange: (nextDumpText: string) => void;
};

const DumpForm = ({ dumpText, dumpTextCount, onTextChange }: DumpFormProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(event.target.value);
  };

  const getStatusMessage = () => {
    if (dumpTextCount === 0) return '';

    if (dumpTextCount < DUMP_TEXT.MIN_LENGTH) {
      return `${DUMP_TEXT.MIN_LENGTH - dumpTextCount}자 더 입력해주세요`;
    }

    if (dumpTextCount >= DUMP_TEXT.MAX_LENGTH) {
      return '최대 글자 수에 도달했습니다';
    }

    if (dumpTextCount >= DUMP_TEXT.WARNING_LENGTH) {
      return '3000자에 가까워요!';
    }
    return '';
  };

  return (
    <div className="dump-form">
      <textarea
        className="dump-textarea"
        value={dumpText}
        onChange={handleChange}
        placeholder="여행에 대해 자유롭게 적어주세요."
        maxLength={DUMP_TEXT.MAX_LENGTH}
      />

      <p className="dump-status-message">{getStatusMessage()}</p>
      <div className="dump-text-count">
        {dumpTextCount} / {DUMP_TEXT.MAX_LENGTH}
      </div>
    </div>
  );
};

export default DumpForm;
