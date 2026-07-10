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
import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';

import GroupingCardDetailPanel from '@/components/grouping/CardDetailPanel';
import PlaceCard from '@/components/grouping/PlaceCard';
import Header from '@/components/header/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTripDetailQuery } from '@/hooks/useTripDetail';
import { cn } from '@/lib/utils';
import type { ChatIntent } from '@/types/chat-api';
import type { PlaceCardViewModel, PlaceCategory } from '@/types/grouping';
import type { Card, CardCategory } from '@/types/grouping-api';
import { chatErrorMessage, parseChat } from '@/utils/chat-api';
import { fetchCards, patchCard } from '@/utils/grouping-api';
import { useOnboardingStore } from '@/utils/onboarding-store';
import { tripDateRangeLabel } from '@/utils/trip-meta';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  cards?: Card[];
  duplicates?: string[];
  intent?: ChatIntent;
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

const INITIAL_INTERESTS = ['food', 'shopping'];
const INITIAL_CONSTRAINTS = ['low_walking'];

const CATEGORY_MAP: Record<CardCategory, PlaceCategory> = {
  place: 'place',
  activity: 'activity',
  transport: 'transport',
  accommodation: 'lodging',
  food: 'food',
  etc: 'place',
};

const CATEGORY_LABELS: Record<CardCategory, string> = {
  place: '장소',
  activity: '활동',
  transport: '교통',
  accommodation: '숙소',
  food: '맛집',
  etc: '기타',
};

const contextLabel = (value: string, options: ContextOption[]) =>
  options.find((option) => option.value === value)?.label ?? value;

const formatDuration = (minutes: number | null): string | undefined => {
  if (minutes == null || minutes < 0) return undefined;
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
};

const toPlaceCardViewModel = (card: Card): PlaceCardViewModel => ({
  id: card.instance_id,
  name: card.name,
  region: card.location ?? undefined,
  durationLabel: formatDuration(card.estimated_duration_min),
  accent: 'green',
  badges: [
    { kind: 'category', category: CATEGORY_MAP[card.category] },
    ...(card.is_ai_generated ? ([{ kind: 'ai' }] as const) : []),
  ],
  detail: {
    classification: '질문있음',
    placementStatus: card.placement_status,
    estimatedDurationMin: card.estimated_duration_min,
    userIntent: card.user_context ?? undefined,
    aiHint: card.tips ?? undefined,
    memo: card.memo ?? '',
    includedInItinerary: !card.is_excluded,
  },
});

const ChatPrototypePage = () => {
  const storeTripId = useOnboardingStore((state) => state.tripId);
  const setStoreTripId = useOnboardingStore((state) => state.actions.setTripId);
  const [searchParams] = useSearchParams();
  const urlTripId = searchParams.get('tripId');
  const tripId = urlTripId ?? storeTripId;
  const tripDetailQuery = useTripDetailQuery(tripId);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [interests, setInterests] = useState(INITIAL_INTERESTS);
  const [constraints, setConstraints] = useState(INITIAL_CONSTRAINTS);
  const [savedCards, setSavedCards] = useState<Card[]>([]);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [isReplying, setIsReplying] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recommendedCount = useMemo(
    () =>
      messages.reduce(
        (count, message) => count + (message.cards?.length ?? 0),
        0
      ),
    [messages]
  );
  const detailViewModel = useMemo(
    () => (detailCard ? toPlaceCardViewModel(detailCard) : null),
    [detailCard]
  );

  useEffect(() => {
    if (urlTripId && urlTripId !== storeTripId) {
      setStoreTripId(urlTripId);
    }
  }, [setStoreTripId, storeTripId, urlTripId]);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    setLoadingCards(true);
    fetchCards(tripId)
      .then((response) => {
        if (cancelled) return;
        setSavedCards(
          response.cards.filter(
            (card) => card.source === 'ai_recommend' && !card.is_excluded
          )
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) setErrorMessage(chatErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setLoadingCards(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  const resetPrototype = () => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setInterests(INITIAL_INTERESTS);
    setConstraints(INITIAL_CONSTRAINTS);
    setDetailCard(null);
    setIsReplying(false);
    setErrorMessage(null);
  };

  const submitMessage = async (rawMessage?: string) => {
    const message = (rawMessage ?? input).trim();
    if (!message || isReplying || !tripId) return;

    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, role: 'user', text: message },
    ]);
    setInput('');
    setIsReplying(true);
    setErrorMessage(null);

    try {
      const response = await parseChat(tripId, {
        message,
        context: { interests, constraints },
        max_cards: 3,
      });
      setInterests(response.updated_context.interests);
      setConstraints(response.updated_context.constraints);
      setSavedCards((current) => {
        const byId = new Map(current.map((card) => [card.instance_id, card]));
        response.created_cards.forEach((card) =>
          byId.set(card.instance_id, card)
        );
        return [...byId.values()];
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
          cards: response.created_cards,
          duplicates: response.duplicates.map((item) => item.name),
          intent: response.intent,
        },
      ]);
    } catch (error) {
      setErrorMessage(chatErrorMessage(error));
    } finally {
      setIsReplying(false);
    }
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
        destination={tripDetailQuery.data?.destinations[0] ?? '여행'}
        extraDestinations={Math.max(
          (tripDetailQuery.data?.destinations.length ?? 1) - 1,
          0
        )}
        travelers={tripDetailQuery.data?.companion_count ?? 1}
        dateRange={tripDateRangeLabel(
          tripDetailQuery.data?.start_date,
          tripDetailQuery.data?.travel_days ?? 0
        )}
        actions={
          <Button variant="outline" size="sm" onClick={resetPrototype}>
            <RefreshCw aria-hidden="true" />
            대화 초기화
          </Button>
        }
      />

      <main className="mx-auto w-full max-w-[1180px] px-6 py-7">
        <div className="mb-5 flex items-end justify-between gap-6">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 px-2 py-1 text-xs">
                <Sparkles className="size-3" aria-hidden="true" />
                LIVE API
              </Badge>
              <span className="text-xs text-muted-foreground">
                Chat Parser 연동 테스트
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
              <strong className="text-primary">{savedCards.length}</strong>
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
                    {tripId ? 'API 연결됨' : '여행 정보 필요'}
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
                <MessageBubble key={message.id} message={message} />
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

            {errorMessage && (
              <div className="mx-4 mb-3 rounded-lg border border-destructive/25 bg-destructive/8 px-4 py-3 text-xs text-destructive">
                {errorMessage}
              </div>
            )}
            {!tripId && (
              <div className="mx-4 mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                여행 정보가 없어요. 온보딩에서 여행을 만들거나 URL에
                <code className="mx-1 rounded bg-amber-100 px-1">
                  ?tripId=…
                </code>
                를 추가해주세요.
              </div>
            )}

            <div className="border-t bg-background p-4">
              <div className="mb-3 flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                {SUGGESTIONS.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => submitMessage(label)}
                    disabled={isReplying || !tripId}
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
                  disabled={!input.trim() || isReplying || !tripId}
                  onClick={() => submitMessage()}
                  aria-label="메시지 보내기"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                추천 결과는 자동 저장되며, 원하지 않는 카드는 상세 패널에서
                제외할 수 있어요.
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

            <SavedCardPreview
              cards={savedCards}
              onOpen={setDetailCard}
              loading={loadingCards}
            />

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
        onExclude={async () => {
          if (!detailCard || !tripId) return;
          try {
            await patchCard(tripId, detailCard.instance_id, {
              is_excluded: true,
            });
            setSavedCards((current) =>
              current.filter(
                (card) => card.instance_id !== detailCard.instance_id
              )
            );
            setDetailCard(null);
          } catch (error) {
            setErrorMessage(chatErrorMessage(error));
          }
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

const MessageBubble = ({ message }: { message: ChatMessage }) => {
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
        {message.duplicates?.map((name) => (
          <div
            key={name}
            className="flex w-full items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          >
            <Copy
              className="size-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <span className="flex-1">{name}</span>
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
              이미 있음
            </Badge>
          </div>
        ))}
        {message.cards?.map((card) => (
          <RecommendationCard key={card.instance_id} card={card} />
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

const RecommendationCard = ({ card }: { card: Card }) => {
  const Icon =
    card.category === 'food'
      ? Utensils
      : card.category === 'activity'
        ? Sparkles
        : card.category === 'etc'
          ? ShoppingBag
          : MapPin;
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
                {card.location ?? card.address ?? '위치 정보 확인됨'}
              </p>
            </div>
            <Button size="sm" variant="secondary" disabled className="shrink-0">
              <Check aria-hidden="true" />
              저장됨
            </Button>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {card.user_context ?? '대화에서 요청한 조건을 반영한 추천이에요.'}
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
  loading,
}: {
  cards: Card[];
  onOpen: (card: Card) => void;
  loading: boolean;
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

    {loading ? (
      <div className="space-y-2">
        <PlaceCard id="loading-1" name="불러오는 중" loading />
        <PlaceCard id="loading-2" name="불러오는 중" loading />
      </div>
    ) : cards.length ? (
      <div className="space-y-2">
        {cards.map((card) => (
          <PlaceCard
            key={card.instance_id}
            id={card.instance_id}
            name={card.name}
            accent="green"
            badges={[
              { kind: 'category', category: CATEGORY_MAP[card.category] },
            ]}
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
          대화로 장소를 추천받으면 자동으로 저장돼요.
        </p>
      </div>
    )}
  </section>
);

export default ChatPrototypePage;
