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
                className='back-button'
                type="button"
                onClick={onBack}>
                이전
            </button>

            <div>
                <p>{nextGuideMessage}</p>

                <button 
                className='next-button'
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