// 메인 랜딩 페이지용 목(mock) 데이터.

export type DestinationItem = {
  id: string;
  name: string;
  country: string;
  tagline: string;
  image: string;
};

export type TravelTip = {
  id: string;
  title: string;
  description: string;
};

export const FEATURED_DESTINATIONS: DestinationItem[] = [
  {
    id: 'kyoto',
    name: '교토',
    country: '일본',
    tagline: '천년 고도의 사찰과 골목',
    image: 'https://picsum.photos/seed/kyoto/800/400',
  },
  {
    id: 'osaka',
    name: '오사카',
    country: '일본',
    tagline: '먹고 즐기는 미식의 도시',
    image: 'https://picsum.photos/seed/osaka/800/400',
  },
  {
    id: 'bangkok',
    name: '방콕',
    country: '태국',
    tagline: '활기 넘치는 야시장과 사원',
    image: 'https://picsum.photos/seed/bangkok/800/400',
  },
  {
    id: 'danang',
    name: '다낭',
    country: '베트남',
    tagline: '해변과 리조트의 휴양지',
    image: 'https://picsum.photos/seed/danang/800/400',
  },
  {
    id: 'taipei',
    name: '타이베이',
    country: '대만',
    tagline: '야시장과 차 문화의 매력',
    image: 'https://picsum.photos/seed/taipei/800/400',
  },
  {
    id: 'paris',
    name: '파리',
    country: '프랑스',
    tagline: '예술과 낭만의 도시',
    image: 'https://picsum.photos/seed/paris/800/400',
  },
];

export const TRAVEL_TIPS: TravelTip[] = [
  {
    id: 'tip-flight',
    title: '항공권은 미리',
    description: '성수기 항공권은 2~3개월 전 예약이 가장 저렴해요.',
  },
  {
    id: 'tip-pack',
    title: '짐은 가볍게',
    description: '필수품 위주로 챙기고 현지 조달 가능한 건 두고 가세요.',
  },
  {
    id: 'tip-route',
    title: '동선은 묶어서',
    description: '가까운 장소끼리 묶으면 이동 시간을 크게 줄일 수 있어요.',
  },
];

/** 메인 랜딩의 "기능 소개" 가로 카루셀용. */
export type FeatureItem = {
  id: string;
  title: string;
  description: string;
  /** 파스텔 배경 (Tailwind 클래스) */
  bg: string;
};

export const SERVICE_FEATURES: FeatureItem[] = [
  {
    id: 'dump',
    title: '자유롭게 던지기',
    description:
      '가고 싶은 곳, 하고 싶은 것을 형식 없이 적기만 하세요. AI가 알아서 여행 카드로 정리해드려요.',
    bg: 'bg-rose-100',
  },
  {
    id: 'organize',
    title: '똑똑한 정리',
    description:
      '비슷한 장소끼리 묶고 빠진 정보를 채워, 흩어진 메모를 깔끔한 카드로 만들어요.',
    bg: 'bg-indigo-100',
  },
  {
    id: 'arrange',
    title: '동선 자동 배치',
    description:
      '가까운 곳끼리 묶어 날짜별로 배치하고, 이동 시간을 줄이는 동선을 제안해요.',
    bg: 'bg-sky-100',
  },
  {
    id: 'confirm',
    title: '지도로 확정',
    description:
      '완성된 일정을 지도에서 한눈에. 동선과 위치를 확인하고 여행을 확정하세요.',
    bg: 'bg-emerald-100',
  },
];
