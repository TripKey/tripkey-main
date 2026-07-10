import {
  ArrowUp,
  Bot,
  Check,
  CloudRain,
  Coffee,
  Copy,
  MapPin,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  UserRound,
  Utensils,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import GroupingCardDetailPanel from '@/components/grouping/CardDetailPanel';
import PlaceCard from '@/components/grouping/PlaceCard';
import Header from '@/components/header/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlaceCardViewModel, PlaceCategory } from '@/types/grouping';

type MockCard = {
  id: string;
  name: string;
  category: PlaceCategory;
  area: string;
  reason: string;
  duration: string;
  estimatedDurationMin: number;
  icon: typeof Coffee;
};

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  cards?: MockCard[];
  duplicate?: string;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome',
    role: 'assistant',
    text: '오사카 여행에 더하고 싶은 장소나 여행 취향을 편하게 알려주세요. 조건에 맞는 장소를 찾아 카드로 정리해드릴게요.',
  },
];

const SUGGESTIONS = [
  { label: '비 오는 날 실내 장소', icon: CloudRain },
  { label: '난바 근처 디저트 카페', icon: Coffee },
  { label: '현지인 맛집 추천', icon: Utensils },
  { label: '쇼핑할 곳 더 찾아줘', icon: ShoppingBag },
];

type ContextOption = { value: string; label: string };

const INTEREST_OPTIONS: ContextOption[] = [
  { value: 'food', label: '맛집' },
  { value: 'cafe', label: '카페' },
  { value: 'shopping', label: '쇼핑' },
  { value: 'landmark', label: '관광지' },
  { value: 'culture_art', label: '문화·예술' },
  { value: 'history', label: '역사' },
  { value: 'nature', label: '자연' },
  { value: 'activity', label: '액티비티' },
  { value: 'night_view', label: '야경' },
  { value: 'local_experience', label: '로컬 체험' },
  { value: 'photography', label: '사진' },
  { value: 'relaxation', label: '휴식' },
];

const CONSTRAINT_OPTIONS: ContextOption[] = [
  { value: 'low_walking', label: '적게 걷기' },
  { value: 'rainy_day_option', label: '우천 대비' },
  { value: 'relaxed_pace', label: '느긋한 일정' },
  { value: 'with_children', label: '아이 동반' },
  { value: 'with_parents', label: '부모님 동반' },
  { value: 'wheelchair_accessible', label: '휠체어 접근' },
  { value: 'indoor_focused', label: '실내 중심' },
  { value: 'public_transit', label: '대중교통 중심' },
  { value: 'budget_friendly', label: '저예산' },
  { value: 'late_hours', label: '늦은 시간 가능' },
];

const MOCK_CARDS: MockCard[] = [
  {
    id: 'osaka-museum',
    name: '오사카 역사박물관',
    category: 'place',
    area: '주오구 · 다니마치욘초메',
    reason: '비 오는 날에도 오사카의 역사를 여유롭게 둘러볼 수 있어요.',
    duration: '약 90분',
    estimatedDurationMin: 90,
    icon: Sparkles,
  },
  {
    id: 'nakanoshima-museum',
    name: '나카노시마 미술관',
    category: 'place',
    area: '기타구 · 나카노시마',
    reason: '실내 전시와 세련된 건축을 함께 즐기기 좋은 선택이에요.',
    duration: '약 120분',
    estimatedDurationMin: 120,
    icon: Sparkles,
  },
  {
    id: 'grand-front',
    name: '그랜드 프론트 오사카',
    category: 'shopping',
    area: '기타구 · 우메다',
    reason: '쇼핑과 식사를 한 공간에서 해결해 이동을 줄일 수 있어요.',
    duration: '약 120분',
    estimatedDurationMin: 120,
    icon: ShoppingBag,
  },
];

const INITIAL_INTERESTS = ['food', 'shopping'];
const INITIAL_CONSTRAINTS = ['low_walking'];

const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  place: '장소',
  lodging: '숙소',
  food: '맛집',
  activity: '활동',
  shopping: '쇼핑',
  transport: '교통',
};

const contextLabel = (value: string, options: ContextOption[]) =>
  options.find((option) => option.value === value)?.label ?? value;

const toPlaceCardViewModel = (
  card: MockCard,
  savedCardIds: string[]
): PlaceCardViewModel => ({
  id: card.id,
  name: card.name,
  region: card.area,
  durationLabel: card.duration,
  accent: 'green',
  badges: [{ kind: 'category', category: card.category }, { kind: 'ai' }],
  detail: {
    classification: '추천 후보',
    placementStatus: '배치 가능',
    estimatedDurationMin: card.estimatedDurationMin,
    userIntent: card.reason,
    aiHint:
      '추천 후보를 카드에 담으면 정리 화면의 확인이 필요한 카드로 이동해요.',
    memo: '',
    includedInItinerary: savedCardIds.includes(card.id),
  },
});

const ChatPrototypePage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [interests, setInterests] = useState(INITIAL_INTERESTS);
  const [constraints, setConstraints] = useState(INITIAL_CONSTRAINTS);
  const [savedCardIds, setSavedCardIds] = useState<string[]>([]);
  const [detailCard, setDetailCard] = useState<MockCard | null>(null);
  const [isReplying, setIsReplying] = useState(false);

  const recommendedCount = useMemo(
    () =>
      messages.reduce(
        (count, message) => count + (message.cards?.length ?? 0),
        0
      ),
    [messages]
  );
  const savedCards = useMemo(
    () => MOCK_CARDS.filter((card) => savedCardIds.includes(card.id)),
    [savedCardIds]
  );
  const detailViewModel = useMemo(
    () => (detailCard ? toPlaceCardViewModel(detailCard, savedCardIds) : null),
    [detailCard, savedCardIds]
  );

  const resetPrototype = () => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setInterests(INITIAL_INTERESTS);
    setConstraints(INITIAL_CONSTRAINTS);
    setSavedCardIds([]);
    setDetailCard(null);
    setIsReplying(false);
  };

  const submitMessage = (rawMessage?: string) => {
    const message = (rawMessage ?? input).trim();
    if (!message || isReplying) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: message },
    ]);
    setInput('');
    setIsReplying(true);

    window.setTimeout(() => {
      const lower = message.toLowerCase();
      let assistantMessage: ChatMessage;

      if (
        lower.includes('걷') ||
        lower.includes('여유') ||
        lower.includes('조건')
      ) {
        setConstraints((current) =>
          current.includes('relaxed_pace')
            ? current
            : [...current, 'relaxed_pace']
        );
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: '좋아요. 많이 걷지 않고 여유롭게 이동하는 일정으로 기억해둘게요. 다음 추천부터 이 조건을 함께 반영할게요.',
        };
      } else if (lower.includes('쿠로몬') || lower.includes('중복')) {
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: '쿠로몬 시장은 이미 카드 목록에 있어서 새로 추가하지 않았어요. 비슷한 분위기의 다른 장소를 원하시면 찾아드릴게요.',
          duplicate: '쿠로몬 시장',
        };
      } else if (lower.includes('친구집') || lower.includes('예약')) {
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: "직접 가실 곳이군요! 그런 장소는 카드 목록의 '직접 추가'로 넣어주시면 돼요.",
        };
      } else {
        if (lower.includes('카페') && !interests.includes('cafe')) {
          setInterests((current) => [...current, 'cafe']);
        }
        if (
          (lower.includes('비') || lower.includes('실내')) &&
          !constraints.includes('rainy_day_option')
        ) {
          setConstraints((current) => [...current, 'rainy_day_option']);
        }
        assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: '말씀해주신 취향과 동선을 고려해서 들러볼 만한 장소를 찾아봤어요.',
          cards: lower.includes('쇼핑')
            ? MOCK_CARDS.slice(2)
            : MOCK_CARDS.slice(0, 3),
        };
      }

      setMessages((current) => [...current, assistantMessage]);
      setIsReplying(false);
    }, 650);
  };

  const toggleSavedCard = (cardId: string) => {
    setSavedCardIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId]
    );
  };

  const addContextItem = ({
    value,
    items,
    options,
    setItems,
  }: {
    value: string;
    items: string[];
    options: ContextOption[];
    setItems: Dispatch<SetStateAction<string[]>>;
  }) => {
    const inputValue = value.trim();
    const matchedOption = options.find(
      (option) =>
        option.value.toLowerCase() === inputValue.toLowerCase() ||
        option.label.toLowerCase() === inputValue.toLowerCase()
    );
    const normalized = matchedOption?.value ?? inputValue;
    if (
      !normalized ||
      normalized.length > 100 ||
      items.length >= 20 ||
      items.some((item) => item.toLowerCase() === normalized.toLowerCase())
    ) {
      return false;
    }
    setItems((current) => [...current, normalized]);
    return true;
  };

  return (
    <div className="min-h-screen bg-muted/60">
      <Header
        currentStepId="organize"
        destination="오사카"
        extraDestinations={1}
        travelers={2}
        dateRange="7월 18일 ~ 7월 22일"
        actions={
          <Button variant="outline" size="sm" onClick={resetPrototype}>
            <RefreshCw aria-hidden="true" />
            초기화
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-[1180px] px-6 py-7">
        <div className="mb-5 flex items-end justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 px-2 py-1 text-xs">
                <Sparkles className="size-3" aria-hidden="true" />
                MOCK PROTOTYPE
              </Badge>
              <span className="text-xs text-muted-foreground">
                API 연결 전 화면 검증용
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              대화로 여행 카드 모으기
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              원하는 장소와 여행 조건을 말하면 추천 후보를 카드로 정리해드려요.
            </p>
          </div>
          <div className="hidden items-center gap-5 text-sm lg:flex">
            <div>
              <span className="text-muted-foreground">추천됨</span>{' '}
              <strong>{recommendedCount}</strong>
            </div>
            <div className="h-4 w-px bg-border" />
            <div>
              <span className="text-muted-foreground">카드에 담음</span>{' '}
              <strong className="text-primary">{savedCardIds.length}</strong>
            </div>
          </div>
        </div>

        <div className="grid min-h-[650px] grid-cols-1 overflow-hidden rounded-2xl border bg-background shadow-sm lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-[650px] min-w-0 flex-col border-b lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="size-4.5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold">TripKey 큐레이터</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {'목 응답 준비됨'}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="font-normal text-muted-foreground"
              >
                최대 3장 추천
              </Badge>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto bg-muted/25 px-6 py-6">
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  savedCardIds={savedCardIds}
                  onToggleCard={toggleSavedCard}
                />
              ))}
              {isReplying && (
                <div className="flex items-start gap-3">
                  <BotAvatar />
                  <div className="flex h-10 items-center gap-1 rounded-2xl rounded-tl-md border bg-background px-4 shadow-xs">
                    {[0, 1, 2].map((index) => (
                      <span
                        key={index}
                        className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60"
                        style={{ animationDelay: `${index * 120}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t bg-background p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {SUGGESTIONS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => submitMessage(label)}
                    disabled={isReplying}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <Icon
                      className="size-3.5 text-muted-foreground"
                      aria-hidden="true"
                    />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 rounded-xl border bg-background p-2 pl-4 shadow-xs focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                <textarea
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value.slice(0, 500))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      submitMessage();
                    }
                  }}
                  rows={2}
                  placeholder="예: 비 오는 날 갈 만한 실내 장소도 넣어줘"
                  className="max-h-28 min-h-11 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  size="icon"
                  className="size-10 shrink-0 rounded-lg"
                  disabled={!input.trim() || isReplying}
                  onClick={() => submitMessage()}
                  aria-label="메시지 보내기"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                현재는 목데이터로 동작하며 입력 내용에 따라 준비된 시나리오를
                보여줍니다.
              </p>
            </div>
          </section>

          <aside className="bg-background">
            <div className="border-b px-5 py-5">
              <p className="text-sm font-semibold">대화가 기억한 여행 취향</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                메시지를 보낼 때마다 전체 맥락이 새로 반영돼요.
              </p>
            </div>
            <ContextSection
              title="관심사"
              items={interests}
              options={INTEREST_OPTIONS}
              allowCustom
              emptyLabel="아직 등록된 관심사가 없어요"
              onAdd={(item) =>
                addContextItem({
                  value: item,
                  items: interests,
                  options: INTEREST_OPTIONS,
                  setItems: setInterests,
                })
              }
              onRemove={(item) =>
                setInterests((current) =>
                  current.filter((value) => value !== item)
                )
              }
            />
            <ContextSection
              title="여행 조건"
              items={constraints}
              options={CONSTRAINT_OPTIONS}
              emptyLabel="아직 등록된 조건이 없어요"
              onAdd={(item) =>
                addContextItem({
                  value: item,
                  items: constraints,
                  options: CONSTRAINT_OPTIONS,
                  setItems: setConstraints,
                })
              }
              onRemove={(item) =>
                setConstraints((current) =>
                  current.filter((value) => value !== item)
                )
              }
            />

            <SavedCardPreview cards={savedCards} onOpen={setDetailCard} />

            <div className="mx-5 mt-2 rounded-xl border border-dashed bg-muted/35 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Copy
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                중복 장소 자동 제외
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                이미 담긴 쿠로몬 시장은 다시 추천하지 않아요. 아래 문장을 입력해
                확인해보세요.
              </p>
              <button
                type="button"
                onClick={() => submitMessage('쿠로몬 시장도 다시 넣어줘')}
                className="mt-3 text-xs font-medium text-primary hover:underline"
              >
                중복 시나리오 실행 →
              </button>
            </div>
          </aside>
        </div>
      </main>

      <GroupingCardDetailPanel
        open={detailCard != null}
        onOpenChange={(open) => {
          if (!open) setDetailCard(null);
        }}
        card={detailViewModel}
        onExclude={() => {
          if (detailCard && savedCardIds.includes(detailCard.id)) {
            toggleSavedCard(detailCard.id);
          }
          setDetailCard(null);
        }}
      />
    </div>
  );
};

const BotAvatar = () => (
  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
    <Bot className="size-4" aria-hidden="true" />
  </div>
);

const MessageBubble = ({
  message,
  savedCardIds,
  onToggleCard,
}: {
  message: ChatMessage;
  savedCardIds: string[];
  onToggleCard: (cardId: string) => void;
}) => {
  const isUser = message.role === 'user';
  return (
    <div className={cn('flex items-start gap-3', isUser && 'justify-end')}>
      {!isUser && <BotAvatar />}
      <div
        className={cn(
          'max-w-[88%] space-y-3',
          isUser && 'flex flex-col items-end'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-6',
            isUser
              ? 'rounded-tr-md bg-foreground text-background'
              : 'rounded-tl-md border bg-background shadow-xs'
          )}
        >
          {message.text}
        </div>
        {message.duplicate && (
          <div className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <Copy
              className="size-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <span className="flex-1">{message.duplicate}</span>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              이미 있음
            </Badge>
          </div>
        )}
        {message.cards?.map((card) => (
          <RecommendationCard
            key={card.id}
            card={card}
            saved={savedCardIds.includes(card.id)}
            onToggle={() => onToggleCard(card.id)}
          />
        ))}
      </div>
      {isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-4" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

const RecommendationCard = ({
  card,
  saved,
  onToggle,
}: {
  card: MockCard;
  saved: boolean;
  onToggle: () => void;
}) => {
  const Icon = card.icon;
  return (
    <article className="w-full overflow-hidden rounded-xl border bg-background shadow-xs">
      <div className="flex gap-4 p-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold">{card.name}</h3>
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {CATEGORY_LABELS[card.category]}
                </Badge>
              </div>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" aria-hidden="true" />
                {card.area} · {card.duration}
              </p>
            </div>
            <Button
              size="sm"
              variant={saved ? 'secondary' : 'default'}
              onClick={onToggle}
              className="shrink-0"
            >
              {saved ? (
                <Check aria-hidden="true" />
              ) : (
                <ArrowUp className="rotate-45" aria-hidden="true" />
              )}
              {saved ? '담았어요' : '카드에 담기'}
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {card.reason}
          </p>
        </div>
      </div>
    </article>
  );
};

const ContextSection = ({
  title,
  items,
  options,
  allowCustom = false,
  emptyLabel,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  options: ContextOption[];
  allowCustom?: boolean;
  emptyLabel: string;
  onAdd: (item: string) => boolean;
  onRemove: (item: string) => void;
}) => {
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');

  const submit = () => {
    if (onAdd(value)) {
      setValue('');
      setAdding(false);
    }
  };

  return (
    <section className="border-b px-5 py-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {items.length}/20
          </span>
          <button
            type="button"
            onClick={() => setAdding((current) => !current)}
            disabled={items.length >= 20}
            className={cn(
              'flex size-6 items-center justify-center rounded-md border transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40',
              adding && 'border-primary/30 bg-primary/8 text-primary'
            )}
            aria-label={`${title} 추가`}
          >
            {adding ? (
              <X className="size-3.5" aria-hidden="true" />
            ) : (
              <Plus className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {adding && (
        <div className="mb-3 rounded-lg border bg-muted/20 p-3">
          <p className="mb-2 text-[11px] font-medium text-muted-foreground">
            {allowCustom ? '선택하거나 직접 입력하세요' : '조건을 선택하세요'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {options.map((option) => {
              const selected = items.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={selected || items.length >= 20}
                  onClick={() => onAdd(option.value)}
                  className={cn(
                    'rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-default',
                    selected &&
                      'border-primary/20 bg-primary/8 text-primary opacity-60'
                  )}
                >
                  {selected && <Check className="mr-1 inline size-3" />}
                  {option.label}
                </button>
              );
            })}
          </div>
          {allowCustom && (
            <div className="mt-3 flex gap-2 border-t pt-3">
              <input
                value={value}
                maxLength={100}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') submit();
                  if (event.key === 'Escape') {
                    setValue('');
                    setAdding(false);
                  }
                }}
                placeholder="목록에 없는 관심사 직접 입력"
                className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2.5 text-xs outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
              <Button
                type="button"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={!value.trim()}
                onClick={submit}
              >
                추가
              </Button>
            </div>
          )}
        </div>
      )}

      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-full bg-primary/8 py-1.5 pl-3 pr-1.5 text-xs font-medium text-primary"
            >
              {contextLabel(item, options)}
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="rounded-full p-0.5 hover:bg-primary/10"
                aria-label={`${contextLabel(item, options)} 삭제`}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      )}
    </section>
  );
};

const SavedCardPreview = ({
  cards,
  onOpen,
}: {
  cards: MockCard[];
  onOpen: (card: MockCard) => void;
}) => (
  <section className="border-b px-5 py-5">
    <div className="mb-3 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold">담은 카드 미리보기</h2>
        <p className="mt-1 text-[11px] text-muted-foreground">
          정리 화면으로 넘어가기 전 목록이에요.
        </p>
      </div>
      <Badge variant="secondary" className="min-w-6 justify-center">
        {cards.length}
      </Badge>
    </div>

    {cards.length ? (
      <div className="space-y-2">
        {cards.map((card) => (
          <PlaceCard
            key={card.id}
            id={card.id}
            name={card.name}
            accent="green"
            onClick={() => onOpen(card)}
          />
        ))}
        <p className="px-1 pt-1 text-[11px] text-muted-foreground">
          카드를 누르면 상세 정보와 제외 기능을 확인할 수 있어요.
        </p>
      </div>
    ) : (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-5 text-center">
        <p className="text-xs font-medium text-muted-foreground">
          아직 담은 카드가 없어요
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/80">
          추천 카드의 ‘카드에 담기’를 눌러보세요.
        </p>
      </div>
    )}
  </section>
);

export default ChatPrototypePage;
