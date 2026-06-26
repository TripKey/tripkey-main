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

const EXAMPLE_TEXT = `꼭 가보고 싶은 명소가 몇 군데 있어, 여긴 무조건 갈 거야.
현지에서 유명한 맛집이랑 분위기 좋은 카페 추천 받고 싶어.
체험거리도 하나쯤 하고 싶은데 뭐가 좋을지 모르겠어.
쇼핑은 어디가 좋을지 아직 못 정했어.`;

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
      <div className="dump-form__header">
        <h2 className="dump-form__title">
          여행 정보 <span className="dump-form__required">*</span>
        </h2>
        <button
          type="button"
          className="dump-form__example-btn"
          onClick={() => onTextChange(EXAMPLE_TEXT)}
        >
          가이드 문장 채우기
        </button>
      </div>

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
