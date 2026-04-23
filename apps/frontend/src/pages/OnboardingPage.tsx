import OnboardingForm from '../components/onboarding/OnboardingForm';

const OnboardingPage = () => {
  return (
    <div>
      <h1>여행 기본 정보</h1>
      <p>어디로, 얼마나, 누구와 떠나나요</p>
      <OnboardingForm
        title="여행 이름"
        name="tripName"
        placeholder="여행의 이름을 입력하세요"
        subtitle="여행을 구분할 수 있는 이름을 자유롭게 입력하세요."
      />
      <OnboardingForm
        title="여행 기간"
        name="tripDuration"
        placeholder="여행 기간을 입력하세요"
        subtitle="복수 선택 가능."
      />
    </div>
  );
};

export default OnboardingPage;
