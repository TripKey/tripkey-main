import './DumpActionBar.css';

type DumpActionBarProps = {
  onBack: () => void
  onNext: () => void
  isNextDisabled: boolean
}

const DumpActionBar = ({onBack, onNext, isNextDisabled}:DumpActionBarProps) => {
    
    const nextGuideMessage = isNextDisabled
    ? '10자 입력시 활성화'
    : 'AI가 입력한 정보를 분석합니다';
    
    return (
        <div className='dump-action-bar'>

            <button 
                className='dump-back-button'
                type="button"
                onClick={onBack}>
                이전
            </button>

            <div className='dump-next-section'>
                <p className='dump-action-message'>
                    {nextGuideMessage}
                </p>

                <button 
                className='dump-next-button'
                type="button"
                onClick={onNext}
                disabled={isNextDisabled}>
                다음
                </button>
            </div>

        </div>
    )
}


export default DumpActionBar;