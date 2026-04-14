import { useNavigate } from 'react-router-dom';

import DumpActionBar from '../components/dump/DumpActionBar';
import DumpForm from '../components/dump/DumpForm';
import DumpGuideCard from '../components/dump/DumpGuideCard';
import { DUMP_TEXT } from '../utils/constants';
import { useDumpStore } from '../utils/dump-store';

import './DumpPage.css';

const DumpPage = ({ tripId }: { tripId: string }) => {
  const { dumpText, requestStatus, errorMessage, setDumpText, submitDump } =
    useDumpStore();

  const dumpTextCount = dumpText.trim().length;

  const isNextDisabled =
    dumpTextCount < DUMP_TEXT.MIN_LENGTH || requestStatus === 'loading';

  const handleDumpTextChange = (nextDumpText: string) => {
    setDumpText(nextDumpText);
  };

  const handleClickBack = () => {
    console.log('이전');
  };

  const navigate = useNavigate();

  const handleClickNext = async () => {
    navigate('/progress');

    const isSuccess = await submitDump(tripId);

    if (!isSuccess) {
      navigate('/dump');
    }
  };

  return (
    <main className="dump-page">
      <div className="area">{/* 공통 컴포넌트 순서도 */}</div>

      <section className="dump-container">
        <div className="dump-header">
          <h1>여행 정보 입력</h1>
          <p>가고 싶은 곳, 하고 싶은 것, 떠오르는 생각을 자유롭게 적어주세요</p>
        </div>

        <DumpGuideCard />

        <DumpForm
          dumpText={dumpText}
          dumpTextCount={dumpTextCount}
          onTextChange={handleDumpTextChange}
        />

        <DumpActionBar
          onBack={handleClickBack}
          onNext={handleClickNext}
          isNextDisabled={isNextDisabled}
          errorMessage={errorMessage}
        />
      </section>
    </main>
  );
};

export default DumpPage;
