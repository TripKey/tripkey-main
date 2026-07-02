import { ArrowLeft, Eye, Sparkles } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import CardDetailPanel, {
  type CommonCardDetailCard,
} from '@/components/card-detail/CardDetailPanel';
import Header from '@/components/header/Header';
import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import { Button } from '@/components/ui/button';

const CardDetailPreviewPage = () => {
  const [selected, setSelected] = useState<CommonCardDetailCard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cards = useMemo(() => previewCards, []);

  const handleStub = (message: string) => {
    setNotice(message);
  };

  return (
    <div className="min-h-screen bg-muted">
      <Header
        currentStepId="organize"
        destination="오사카"
        travelers={2}
        dateRange="5월 10일 ~ 5월 14일"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/grouping">
              <ArrowLeft className="size-4" aria-hidden="true" />
              정리 화면
            </Link>
          </Button>
        }
      />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            카드 디테일 패널 프리뷰
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            03/04에서 공유하는 공통 카드 디테일 패널의 상태별 목데이터예요.
          </p>
        </div>

        {notice && (
          <div className="mb-5 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
            {notice}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setNotice(null);
                setSelected(card);
              }}
              className="rounded-xl bg-background p-4 text-left ring-1 ring-border transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {card.name}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.detail?.classification} ·{' '}
                    {card.detail?.placementStatus}
                  </p>
                </div>
                <Eye className="size-4 shrink-0 text-muted-foreground" />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {card.badges?.map((badge, index) => (
                  <PlaceCardBadge key={index} {...badge} />
                ))}
              </div>
              {card.actionGuide && (
                <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-amber-700">
                  {card.actionGuide}
                </p>
              )}
            </button>
          ))}
        </div>

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-foreground">
              카드 추가 리팩토링 프리뷰
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              카드 추가를 확정 입력과 AI 요청 입력으로 분리했을 때의 화면 초안이에요.
            </p>
          </div>

          <AddCardRefactorPreview />
        </section>
      </main>

      <CardDetailPanel
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        card={selected}
        onSaveMemo={(memo) => handleStub(`메모 저장: ${memo || '(빈 값)'}`)}
        onExclude={() => handleStub('제외하기 액션이 호출됐어요.')}
        onInclude={() => handleStub('포함하기 액션이 호출됐어요.')}
        onConfirmSelection={(payload) =>
          handleStub(`선택 확인: ${JSON.stringify(payload)}`)
        }
        onResolveByStructuredEdit={({ payload }) =>
          handleStub(`구조화 저장: ${JSON.stringify(payload)}`)
        }
        onSelectProcess={() => handleStub('선택처리 액션이 호출됐어요.')}
        resolveError={
          selected?.id === 'failed-place'
            ? '현재 정보로는 위치를 찾지 못했어요. 장소명이나 주소를 더 정확히 입력해 주세요.'
            : null
        }
      />
    </div>
  );
};

export default CardDetailPreviewPage;

const previewInputClass =
  'h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground';

const AddCardRefactorPreview = () => {
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const isManual = mode === 'manual';

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="rounded-xl bg-background p-5 ring-1 ring-border">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {[
            { value: 'manual', label: '직접 추가' },
            { value: 'ai', label: 'AI에게 요청' },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMode(item.value as 'manual' | 'ai')}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                mode === item.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {isManual ? (
          <div className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewField label="카드 이름">
                <input
                  readOnly
                  value="유니버설 스튜디오 재팬"
                  className={previewInputClass}
                />
              </PreviewField>
              <PreviewField label="카테고리">
                <input readOnly value="장소" className={previewInputClass} />
              </PreviewField>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewField label="지역">
                <input readOnly value="오사카" className={previewInputClass} />
              </PreviewField>
              <PreviewField label="체류시간(분)">
                <input readOnly value="480" className={previewInputClass} />
              </PreviewField>
            </div>
            <PreviewField label="사용자 메모">
              <textarea
                readOnly
                value="익스프레스 패스 가격 확인하기"
                rows={3}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </PreviewField>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <PreviewField label="AI에게 맡길 내용">
              <textarea
                readOnly
                value={'오사카 맛집을 더 찾아야 해\n도톤보리 근처에서 저녁으로 갈 만한 곳 추천해줘'}
                rows={5}
                className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm leading-relaxed text-foreground"
              />
            </PreviewField>
            <div className="grid gap-4 sm:grid-cols-2">
              <PreviewField label="선택 카테고리">
                <input readOnly value="맛집" className={previewInputClass} />
              </PreviewField>
              <PreviewField label="지역 힌트">
                <input readOnly value="오사카" className={previewInputClass} />
              </PreviewField>
            </div>
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm">
            닫기
          </Button>
          <Button size="sm">
            {isManual ? '카드 추가하기' : 'AI로 카드 만들기'}
          </Button>
        </div>
      </div>

      <div className="rounded-xl bg-background p-5 ring-1 ring-border">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-bold text-foreground">예상 결과</h3>
        </div>
        {isManual ? (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              사용자가 이미 알고 있는 장소를 일정 후보로 추가해요. 기본 상태는
              확정 카드로 시작해요.
            </p>
            <div className="rounded-lg bg-muted p-3">
              <p className="font-semibold text-foreground">확정됨 · 배치 가능</p>
              <p className="mt-1">유니버설 스튜디오 재팬</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              입력 문장을 card-level AI 파싱에 태워, 확정/미결정/입력 필요를
              AI 결과 기준으로 결정해요.
            </p>
            <div className="rounded-lg bg-muted p-3">
              <p className="font-semibold text-foreground">미결정 · 선택 필요</p>
              <p className="mt-1">오사카 저녁 맛집 후보</p>
              <p className="mt-2 text-xs">
                옵션: 타코야키, 스키야키, 오코노미야키
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PreviewField = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="block space-y-2">
    <span className="text-sm font-semibold text-foreground">{label}</span>
    {children}
  </label>
);

const previewCards: CommonCardDetailCard[] = [
  {
    id: 'confirmed-place',
    name: '유니버설 스튜디오 재팬',
    badges: [{ kind: 'category', category: 'place' }],
    detail: {
      classification: '확정됨',
      placementStatus: '배치 가능',
      region: '오사카',
      durationLabel: '8시간',
      userIntent: '하루를 충분히 써서 테마파크를 즐기고 싶어요.',
      aiHint: '인기 어트랙션은 오전에 먼저 배치하는 편이 좋아요.',
      memo: '익스프레스 패스 가격 확인하기',
      includedInItinerary: true,
    },
  },
  {
    id: 'excluded-food',
    name: '도톤보리 타코야키 후보',
    accent: 'muted',
    badges: [
      { kind: 'category', category: 'food' },
      { kind: 'status', label: '제외', tone: 'fail' },
    ],
    detail: {
      classification: '확정됨',
      placementStatus: '제외됨',
      region: '도톤보리',
      durationLabel: '40분',
      userIntent: '간식 후보로 저장해 둔 항목',
      memo: '이번 일정에서는 제외',
      includedInItinerary: false,
    },
  },
  {
    id: 'failed-place',
    name: '글리코 사인 앞',
    badges: [
      { kind: 'category', category: 'place' },
      { kind: 'ai' },
      { kind: 'status', label: '위치 확인 필요', tone: 'pending' },
    ],
    actionGuide:
      "'글리코 사인 앞' 카드는 AI 보강 중 문제가 생겼어요.\n\n일정 배치는 가능하지만, 장소명·주소가 부정확하다면 아래에서 보완해 주세요.",
    detail: {
      classification: '미결정',
      placementStatus: '입력 필요',
      region: '오사카',
      userIntent: '도톤보리 야경 사진을 찍고 싶어요.',
      aiHint: '정확한 주소나 주변 역 정보를 넣으면 지도 위치를 찾기 쉬워요.',
      question: '이 장소를 이렇게 다시 찾아볼까요?',
      answer: '도톤보리 글리코 사인',
      canResolveByNotes: true,
      includedInItinerary: true,
    },
  },
  {
    id: 'accommodation-edit',
    name: '난바역 근처 호텔',
    badges: [{ kind: 'category', category: 'lodging' }],
    actionGuide:
      "'난바역 근처 호텔' 카드는 숙소 위치가 더 구체적이면 동선 검증에 도움이 돼요.",
    detail: {
      classification: '확정됨',
      placementStatus: '부분 준비',
      durationLabel: '체크인 15:00 / 체크아웃 11:00',
      userIntent: '난바역에서 도보 이동 가능한 숙소',
      canResolveByStructuredEdit: true,
      structuredEditCategory: 'accommodation',
      structuredFields: {
        location: '난바역',
        checkIn: '15:00',
        checkOut: '11:00',
      },
      canSelectProcess: true,
      includedInItinerary: true,
    },
  },
  {
    id: 'transport-fixed',
    name: '간사이공항 → 난바',
    draggable: false,
    badges: [{ kind: 'category', category: 'transport' }],
    detail: {
      classification: '확정됨',
      placementStatus: 'Day 1 고정',
      fixedTimeLabel: '5월 10일 11:30 도착',
      region: '간사이국제공항',
      durationLabel: '50분',
      userIntent: '공항에서 바로 숙소 근처로 이동',
      includedInItinerary: true,
    },
  },
  {
    id: 'ai-generated',
    name: '구로몬시장 점심 후보',
    badges: [
      { kind: 'category', category: 'food' },
      { kind: 'ai' },
      { kind: 'status', label: '배치됨', tone: 'pending' },
    ],
    detail: {
      classification: '질문있음',
      placementStatus: '부분 준비',
      region: '닛폰바시',
      durationLabel: '1시간',
      userIntent: '가볍게 먹을 수 있는 점심 후보',
      aiHint: '시장 내부는 점심 시간대에 혼잡할 수 있어요.',
      canResolveByNotes: true,
      question: '구로몬시장에서 어떤 식사 후보를 우선할까요?',
      choices: ['해산물 덮밥', '꼬치/간식', '초밥', '가볍게 둘러보기'],
      selectedChoices: ['해산물 덮밥'],
      answer: '',
      includedInItinerary: true,
    },
  },
];
