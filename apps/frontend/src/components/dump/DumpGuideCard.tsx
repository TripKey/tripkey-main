import './DumpGuideCard.css';

const guideItems = [
  '가고 싶은 지역, 관광지, 맛집',
  '원하는 여행 분위기나 스타일',
  '시간 제약, 이동방식',
];

const DumpGuideCard = () => {
  return (
    <div className="dump-guide-card">
      <h2 className="dump-guide-title">
        여행 계획을 세우는 데 도움이 될 수 있도록, 다음과 같은 내용을 입력해
        주세요.
      </h2>

      <ul className="dump-guide-list">
        {guideItems.map((item) => (
          <li key={item} className="dump-guide-item">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DumpGuideCard;
