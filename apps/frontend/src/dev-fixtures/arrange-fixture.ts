// 배치(SCR-04) 화면 개발용 목데이터.
// 스크린샷 시안과 동일한 카드 구성(좌측 12개 그룹 카드 + Day 1~5 보드, 미배치 10개).
// 실제 BE 연동(그룹/배치 API) 전까지 ArrangePage 를 정적으로 렌더링하기 위한 임시 데이터다.
// BE 연동 시 이 파일은 삭제하고 fetch + 매퍼로 교체한다.
import type { ArrangeViewModel } from '@/types/arrange';

export const ARRANGE_FIXTURE: ArrangeViewModel = {
  summary: {
    destination: '교토',
    extraDestinations: 2,
    travelers: 2,
    dateRange: '5월 10일 ~ 5월 14일',
  },
  heading: {
    title: '일정 배치',
    subtitle: 'available/unavailable 구조로 배치 가능한 카드를 정리했어요',
  },
  cardListTitle: '카드 목록',
  groups: [
    {
      id: 'flight',
      title: '항공권',
      description:
        '항공권은 Day에 고정되어 있어도 변경될 수 있어요. 드래그하지 않고 클릭해서 수정합니다.',
      cards: [
        {
          id: 'flight-arrive',
          name: '간사이 공항 도착',
          accent: 'green',
          draggable: false,
          detail: {
            classification: '고정 일정',
            placementStatus: 'Day 1 고정',
            fixedTimeLabel: '5월 10일 11:20 도착',
            region: '간사이 국제공항 (KIX)',
            durationLabel: '입국 수속 약 1시간',
            userIntent: '오사카 인근 공항으로 도착하는 항공편',
            aiHint: '공항에서 교토 시내까지 하루카 특급으로 약 75분 걸려요.',
          },
        },
        {
          id: 'flight-depart',
          name: '간사이 공항 출발',
          accent: 'green',
          draggable: false,
          detail: {
            classification: '고정 일정',
            placementStatus: 'Day 5 고정',
            fixedTimeLabel: '5월 14일 13:40 출발',
            region: '간사이 국제공항 (KIX)',
            durationLabel: '탑승 수속 2시간 전 도착 권장',
            userIntent: '귀국 항공편',
            aiHint:
              '출국 당일 오전은 공항 이동 시간을 고려해 가볍게 잡는 게 좋아요.',
          },
        },
      ],
    },
    {
      id: 'lodging',
      title: '숙소',
      description:
        '숙소 카드는 체크인/체크아웃 기준이 달라 지역 그룹과 분리했어요.',
      cards: [
        {
          id: 'lodging-kyoto',
          name: '교토 게스트하우스',
          accent: 'blue',
          badges: [{ kind: 'category', category: 'lodging' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '교토 기온',
            durationLabel: '체크인 15:00 / 체크아웃 11:00',
            userIntent: '교토 중심부 도보 이동이 가능한 숙소',
            aiHint: '기온 거리·야사카 신사가 도보 10분 거리예요.',
          },
        },
        {
          id: 'lodging-namba',
          name: '오사카 난바 호텔',
          accent: 'green',
          badges: [{ kind: 'category', category: 'lodging' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '오사카 난바',
            durationLabel: '체크인 16:00 / 체크아웃 10:00',
            userIntent: '난바역 인근 교통이 편한 호텔',
            aiHint: '도톤보리·신사이바시가 도보권이라 저녁 일정과 묶기 좋아요.',
          },
        },
        {
          id: 'lodging-umeda',
          name: '오사카 우메다 호텔',
          accent: 'green',
          badges: [{ kind: 'category', category: 'lodging' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '오사카 우메다',
            durationLabel: '체크인 15:00 / 체크아웃 11:00',
            userIntent: '우메다 쇼핑가 근처 숙소',
            aiHint: '우메다는 교토·고베 모두 접근이 좋아 거점으로 적합해요.',
          },
        },
      ],
    },
    {
      id: 'osaka',
      title: '오사카',
      description: '오사카 기준으로 바로 배치 가능한 카드를 묶은 그룹이에요.',
      cards: [
        {
          id: 'osaka-usj',
          name: '유니버설 스튜디오 재팬',
          accent: 'green',
          badges: [{ kind: 'category', category: 'place' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '오사카 코노하나구',
            durationLabel: '약 8시간',
            userIntent: '하루 종일 즐기고 싶은 테마파크',
            aiHint:
              '개장 직후 입장하면 인기 어트랙션 대기를 크게 줄일 수 있어요.',
          },
        },
      ],
    },
    {
      id: 'kyoto',
      title: '교토',
      description: '교토 기준으로 바로 배치 가능한 카드를 묶은 그룹이에요.',
      cards: [
        {
          id: 'kyoto-gion',
          name: '기온 거리 산책',
          accent: 'green',
          badges: [{ kind: 'category', category: 'activity' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '교토 기온',
            durationLabel: '약 2시간',
            userIntent: '전통 거리 분위기를 느끼고 싶음',
            aiHint: '해질 무렵 하나미코지 거리가 가장 분위기 있어요.',
          },
        },
        {
          id: 'kyoto-arashiyama',
          name: '아라시야마 대나무숲',
          accent: 'blue',
          badges: [{ kind: 'ai' }, { kind: 'category', category: 'place' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '교토 아라시야마',
            durationLabel: '약 3시간',
            userIntent: '사진 찍기 좋은 자연 명소',
            aiHint: '오전 9시 이전이 인파가 적어 대나무숲 사진 찍기 좋아요.',
          },
        },
      ],
    },
    {
      id: 'nara',
      title: '나라',
      description: '나라 기준으로 바로 배치 가능한 카드를 묶은 그룹이에요.',
      cards: [
        {
          id: 'nara-deer',
          name: '나라 사슴 공원',
          accent: 'green',
          badges: [{ kind: 'category', category: 'place' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '나라 공원',
            durationLabel: '약 2시간 30분',
            userIntent: '사슴과 교감할 수 있는 곳',
            aiHint:
              '시카센베이(사슴 과자)는 공원 입구 가판에서 구할 수 있어요.',
          },
        },
      ],
    },
    {
      id: 'food',
      title: '맛집',
      description:
        '식사/카페 카드는 어느 Day에나 끼워 넣기 좋아 따로 묶었어요.',
      cards: [
        {
          id: 'food-dotonbori',
          name: '도톤보리 맛집 투어',
          accent: 'amber',
          badges: [{ kind: 'category', category: 'food' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '오사카 도톤보리',
            durationLabel: '약 2시간',
            userIntent: '오사카 명물 길거리 음식 탐방',
            aiHint: '타코야키·오코노미야키는 저녁 시간대 웨이팅이 길어요.',
          },
        },
        {
          id: 'food-ramen',
          name: '이치란 라멘 본점',
          accent: 'green',
          badges: [{ kind: 'category', category: 'food' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '오사카 난바',
            durationLabel: '약 1시간',
            userIntent: '유명 돈코츠 라멘 맛보기',
            aiHint: '본점은 식사 시간대 줄이 길어 피크 시간을 피하면 좋아요.',
          },
        },
        {
          id: 'food-cafe',
          name: '아라비카 교토 카페',
          accent: 'green',
          badges: [{ kind: 'ai' }, { kind: 'category', category: 'food' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            region: '교토 아라시야마',
            durationLabel: '약 1시간',
            userIntent: '강변 뷰 카페에서 휴식',
            aiHint: '아라시야마 대나무숲 일정과 묶으면 동선이 자연스러워요.',
          },
        },
      ],
    },
  ],
  days: [
    {
      id: 'day-1',
      dayLabel: 'Day 1',
      dateLabel: '5월 10일 (토)',
      cards: [
        {
          id: 'sched-arrive',
          name: '간사이 공항 도착',
          fixedTime: '11:20',
        },
      ],
    },
    {
      id: 'day-2',
      dayLabel: 'Day 2',
      dateLabel: '5월 11일 (일)',
      cards: [],
    },
    {
      id: 'day-3',
      dayLabel: 'Day 3',
      dateLabel: '5월 12일 (월)',
      cards: [],
    },
    {
      id: 'day-4',
      dayLabel: 'Day 4',
      dateLabel: '5월 13일 (화)',
      cards: [],
    },
    {
      id: 'day-5',
      dayLabel: 'Day 5',
      dateLabel: '5월 14일 (수)',
      cards: [],
    },
  ],
};
