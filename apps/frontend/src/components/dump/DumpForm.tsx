import { useState } from 'react';

import { DUMP_TEXT } from '../../utils/constants';

import './DumpForm.css';
import DumpGuideDialog from './DumpGuideDialog';

type DumpFormProps = {
  dumpText: string;
  dumpTextCount: number;
  onTextChange: (nextDumpText: string) => void;
};

const PLACEHOLDER = `도쿄 여행 3박 4일 계획중이야`;

const HELPER_TEXT =
  '메모, 카톡 대화, 검색 기록 등을 자유롭게 붙여넣어 주세요 (최소 10자 이상)';

const DumpForm = ({ dumpText, dumpTextCount, onTextChange }: DumpFormProps) => {
  const [guideOpen, setGuideOpen] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(event.target.value);
  };

  const handleAddGuideText = (guideText: string) => {
    const separator = dumpText.trim() ? '\n\n' : '';
    const nextText = `${dumpText.trimEnd()}${separator}${guideText}`;
    onTextChange(nextText.slice(0, DUMP_TEXT.MAX_LENGTH));
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
          onClick={() => setGuideOpen(true)}
        >
          가이드로 시작하기
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

      <DumpGuideDialog
        open={guideOpen}
        onOpenChange={setGuideOpen}
        onAdd={handleAddGuideText}
      />
    </div>
  );
};

export default DumpForm;
