// 메인 랜딩 페이지용 목(mock) 데이터.

export type DestinationItem = {
  id: string;
  name: string;
  country: string;
  tagline: string;
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
  },
  {
    id: 'osaka',
    name: '오사카',
    country: '일본',
    tagline: '먹고 즐기는 미식의 도시',
  },
  {
    id: 'bangkok',
    name: '방콕',
    country: '태국',
    tagline: '활기 넘치는 야시장과 사원',
  },
  {
    id: 'danang',
    name: '다낭',
    country: '베트남',
    tagline: '해변과 리조트의 휴양지',
  },
  {
    id: 'taipei',
    name: '타이베이',
    country: '대만',
    tagline: '야시장과 차 문화의 매력',
  },
  {
    id: 'paris',
    name: '파리',
    country: '프랑스',
    tagline: '예술과 낭만의 도시',
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
