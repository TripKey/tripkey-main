// SCR-03 그룹화('정보 정리하기') 목데이터
//추후 API 연동 시: fsd `0-8` 의 PlaceCard/Group 응답 → 이 ViewModel 로
//변환하는 매핑 함수를 만들고, GroupingPage 가 그 결과를 받게 바꾸면 이 파일은 삭제.

import type { GroupingViewModel } from '@/types/grouping';

export const GROUPING_MOCK: GroupingViewModel = {
  heading: {
    title: '정보 정리하기',
    subtitle: '모든 상태 케이스를 확인할 수 있도록 목데이터를 확장해두었습니다',
  },

  progress: { percent: 75, activeCount: 8, doneCount: 6 },

  groups: [
    {
      variant: 'select',
      title: '선택이 필요한 카드들',
      countLabel: '1개의 카드가 선택이 필요해요',
      defaultOpen: false,
      cards: [
        {
          id: 'select-dotonbori',
          name: '도톤보리 맛집 투어',
          region: '오사카',
          accent: 'blue',
          badges: [{ kind: 'category', category: 'food' }],
          reminder:
            '비슷한 맛집 카드가 2개 있어요. 한 곳을 선택하거나 둘 다 유지할 수 있어요.',
          selectDetail: {
            classification: '미결정',
            placementStatus: '일부 부족',
            userIntent: '도톤보리 맛집 여러 곳 둘러볼 예정',
            aiHint: '저녁 시간대는 웨이팅이 길 수 있어요',
            question: '도톤보리에서 방문할 맛집을 선택해주세요',
            choices: ['이치란 라멘', '쿠이다오레', '타코야키 도라쿠'],
            includedInItinerary: true,
          },
        },
      ],
    },

    {
      variant: 'edit',
      title: '수정이 필요한 카드들',
      countLabel: '1개의 카드가 수정이 필요해요',
      defaultOpen: true,
      cards: [
        {
          id: 'edit-wasaka',
          name: '와사카 성',
          accent: 'blue',
          badges: [
            { kind: 'status', label: '실패', tone: 'fail' }, // "× 실패" (빨강 pill) — 리스트 카드에만
            { kind: 'ai' }, // "AI" — 리스트 카드에만
            { kind: 'more', label: '기타' }, // "⋯ 기타" — 리스트 + 패널 헤더 공통
          ],
          reminder: '오타인 것 같아요. 실제 장소명을 확인해주세요.',
          editDetail: {
            classification: '질문있음',
            placementStatus: '배치 불가',
            userIntent: 'AI가 장소명을 잘못 해석했을 가능성이 있어요',
            aiHint: '정확한 장소명으로 수정하면 이후 배치가 쉬워져요',
            reason: '오타인 것 같아요',
            retryNotice:
              '아래에 올바른 정보를 입력해주시면 다시 처리를 시도합니다',
            question: '오타인 것 같아요. 실제 장소명을 확인해주세요.',
          },
        },
      ],
    },

    {
      variant: 'review',
      title: '확인만 하면 되는 카드들',
      countLabel: '6개의 카드가 검토만 남았어요',
      defaultOpen: true,
      cards: [
        {
          id: 'review-usj',
          name: '유니버설 스튜디오 재팬',
          region: '오사카',
          durationLabel: '8시간',
          accent: 'green',
          badges: [{ kind: 'category', category: 'place' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            userIntent: '하루 종일 놀 예정이에요',
            aiHint: '오픈런 추천, 인기 어트랙션은 오전에 먼저 방문하세요',
            includedInItinerary: true,
          },
        },
        {
          id: 'review-gion',
          name: '기온 거리 산책',
          region: '교토',
          durationLabel: '1시간 30분',
          accent: 'muted',
          badges: [{ kind: 'category', category: 'activity' }],
          processing: true,
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            userIntent: '저녁에 분위기 있는 골목을 걷고 싶어요',
            includedInItinerary: true,
          },
        },
        {
          id: 'review-kyoto-guesthouse',
          name: '교토 게스트하우스',
          region: '교토',
          durationLabel: '0분',
          accent: 'blue',
          badges: [{ kind: 'category', category: 'lodging' }],
          reminder: '아직 게스트하우스를 예약 안하셨어요.',
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            userIntent: '저렴하고 깔끔한 숙소면 좋겠어요',
            includedInItinerary: true,
          },
        },
        {
          id: 'review-nara-park',
          name: '나라 사슴공원',
          region: '나라',
          durationLabel: '2시간',
          accent: 'green',
          badges: [{ kind: 'category', category: 'activity' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            userIntent: '사슴이랑 사진 찍고 싶어요',
            aiHint:
              '사슴 센베이는 매점에서만 팔아요. 한 번에 너무 많이 사면 사슴이 몰려와요',
            includedInItinerary: true,
          },
        },
        {
          id: 'review-osaka-castle',
          name: '오사카성 공원',
          region: '오사카',
          durationLabel: '90분',
          accent: 'green',
          badges: [{ kind: 'category', category: 'place' }],
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            userIntent: '벚꽃 시즌이라 공원도 같이 둘러보고 싶어요',
            aiHint: '천수각 내부 관람은 별도 입장권이 필요해요',
            includedInItinerary: true,
          },
        },
        {
          id: 'review-fushimi-inari',
          name: '후시미 이나리 신사',
          region: '교토',
          durationLabel: '90분',
          accent: 'blue',
          badges: [{ kind: 'category', category: 'place' }],
          reminder: '이른 아침 방문을 추천해요. 낮에는 사람이 많이 붐벼요.',
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            userIntent: '천 개의 토리이 사이에서 인생샷 찍고 싶어요',
            includedInItinerary: true,
          },
        },
      ],
    },

    {
      variant: 'unassigned',
      title: '제외된 카드들',
      countLabel: '3개의 카드가 일정에 포함되지 않았어요',
      defaultOpen: true,
      cards: [
        {
          id: 'unassigned-otaru',
          name: '오타루 운하',
          accent: 'muted',
          badges: [{ kind: 'category', category: 'place' }],
          reminder:
            '여행지에 없는 지역이에요. 수정하거나 원하는 그룹으로 옮겨주세요.',
          actionLabel: '수정하기',
        },
        {
          id: 'unassigned-ramen',
          name: '이름 모를 라멘집',
          accent: 'red',
          badges: [
            { kind: 'status', label: '실패', tone: 'fail' },
            { kind: 'category', category: 'food' },
          ],
          reminder: '장소를 찾지 못했어요. 정확한 이름으로 다시 적어주세요.',
          actionLabel: '수정하기',
        },
        {
          id: 'unassigned-harukas',
          name: '하루카스 300 전망대',
          region: '오사카',
          durationLabel: '1시간 30분',
          accent: 'muted',
          badges: [{ kind: 'category', category: 'place' }],
          reminder:
            '여행 일정에서 제외한 항목이에요. 눌러서 다시 포함할 수 있어요.',
          detail: {
            classification: '확정됨',
            placementStatus: '배치 가능',
            aiHint: '날씨 맑은 날 방문 추천',
            includedInItinerary: false,
          },
        },
      ],
    },
  ],

  summary: {
    destinations: ['오사카', '교토', '나라'],
    dateRange: '5월 10일 ~ 5월 14일',
    nights: 4,
    days: 5,
    travelers: 2,
    totalCards: 11,
    cardStats: [
      { label: '입력', count: 0, tone: 'neutral' },
      { label: '선택', count: 1, tone: 'select' },
      { label: '수정', count: 1, tone: 'edit' },
      { label: '완료', count: 6, tone: 'done' },
      { label: '제외', count: 3, tone: 'neutral' },
    ],
    completionPct: 75,
  },
};
