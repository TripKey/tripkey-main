import { DUMP_TEXT } from '../../utils/constants';

import './DumpForm.css';

type DumpFormProps = {
  dumpText: string;
  dumpTextCount: number;
  onTextChange: (nextDumpText: string) => void;
};

const PLACEHOLDER = `도쿄 여행 3박 4일 계획중이야`;

const HELPER_TEXT =
  '메모, 카톡 대화, 검색 기록 등을 자유롭게 붙여넣어 주세요 (최소 10자 이상)';

const DumpForm = ({ dumpText, dumpTextCount, onTextChange }: DumpFormProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(event.target.value);
  };

  const getStatusMessage = () => {
    if (dumpTextCount === 0) return HELPER_TEXT;

    if (dumpTextCount < DUMP_TEXT.MIN_LENGTH) {
      return `${DUMP_TEXT.MIN_LENGTH - dumpTextCount}자 더 입력해주세요`;
    }

    if (dumpTextCount >= DUMP_TEXT.MAX_LENGTH) {
      return '최대 글자 수에 도달했습니다';
    }

    if (dumpTextCount >= DUMP_TEXT.WARNING_LENGTH) {
      return '3000자에 가까워요!';
    }
    return HELPER_TEXT;
  };

  return (
    <div className="dump-form">
      <h2 className="dump-form__title">
        여행 정보 <span className="dump-form__required">*</span>
      </h2>

      <div className="dump-textarea-wrapper">
        <textarea
          className="dump-textarea"
          value={dumpText}
          onChange={handleChange}
          placeholder={PLACEHOLDER}
          maxLength={DUMP_TEXT.MAX_LENGTH}
        />
        <div className="dump-text-count">
          {dumpTextCount} / {DUMP_TEXT.MAX_LENGTH.toLocaleString()}
        </div>
      </div>

      <p className="dump-status-message">{getStatusMessage()}</p>
    </div>
  );
};

export default DumpForm;
