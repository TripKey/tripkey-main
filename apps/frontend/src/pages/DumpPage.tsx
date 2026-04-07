import { useState } from 'react';

import DumpActionBar from '../components/dump/DumpActionBar';
import DumpGuideCard from '../components/dump/DumpGuideCard';
import DumpForm from '../components/dump/DumpForm';

const MIN_DUMP_TEXT_LENGTH = 10;

const DumpPage = () => {
    const [dumpText, setDumpText] = useState('');

    const dumpTextCount = dumpText.trim().length;
    const isNextDisabled = dumpTextCount < MIN_DUMP_TEXT_LENGTH;

    const handleDumpTextChange = (nextDumpText: string) => {
        setDumpText(nextDumpText);
    };

    const handleClickBack = () => {
        console.log('이전');
    };
    const handleClickNext = () => {
        console.log('다음');
    };

    return (
        <main className='dump-page'>
            <div className='area'>
                {/*공통 컴포넌트 순서도*/}
            </div>

            <section className='container'>
                <div className='header'>
                    <h1 >여행 정보 입력</h1>
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
                />
            </section>
        </main>
    )
}

export default DumpPage;