import {
  ArrowUp,
  Bot,
  Check,
  CloudRain,
  Coffee,
  Copy,
  MapPin,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  UserRound,
  Utensils,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import Header from '@/components/header/Header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type MockCard = {
  id: string;
  name: string;
  category: string;
  area: string;
  reason: string;
  duration: string;
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

const MOCK_CARDS: MockCard[] = [
  {
    id: 'osaka-museum',
    name: '오사카 역사박물관',
    category: '볼거리',
    area: '주오구 · 다니마치욘초메',
    reason: '비 오는 날에도 오사카의 역사를 여유롭게 둘러볼 수 있어요.',
    duration: '약 90분',
    icon: Sparkles,
  },
  {
    id: 'nakanoshima-museum',
    name: '나카노시마 미술관',
    category: '문화',
    area: '기타구 · 나카노시마',
    reason: '실내 전시와 세련된 건축을 함께 즐기기 좋은 선택이에요.',
    duration: '약 120분',
    icon: Sparkles,
  },
  {
    id: 'grand-front',
    name: '그랜드 프론트 오사카',
    category: '쇼핑',
    area: '기타구 · 우메다',
    reason: '쇼핑과 식사를 한 공간에서 해결해 이동을 줄일 수 있어요.',
    duration: '약 120분',
    icon: ShoppingBag,
  },
];

const INITIAL_INTERESTS = ['맛집', '쇼핑'];
const INITIAL_CONSTRAINTS = ['적게 걷기'];

const ChatPrototypePage = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [interests, setInterests] = useState(INITIAL_INTERESTS);
  const [constraints, setConstraints] = useState(INITIAL_CONSTRAINTS);
  const [savedCardIds, setSavedCardIds] = useState<string[]>([]);
  const [isReplying, setIsReplying] = useState(false);

  const recommendedCount = useMemo(
    () =>
      messages.reduce(
        (count, message) => count + (message.cards?.length ?? 0),
        0
      ),
    [messages]
  );

  const resetPrototype = () => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setInterests(INITIAL_INTERESTS);
    setConstraints(INITIAL_CONSTRAINTS);
    setSavedCardIds([]);
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
          current.includes('느긋한 일정')
            ? current
            : [...current, '느긋한 일정']
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
        if (lower.includes('카페') && !interests.includes('카페')) {
          setInterests((current) => [...current, '카페']);
        }
        if (
          (lower.includes('비') || lower.includes('실내')) &&
          !constraints.includes('우천 대비')
        ) {
          setConstraints((current) => [...current, '우천 대비']);
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
                    <span className="size-1.5 rounded-full bg-emerald-500" />목
                    응답 준비됨
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
              emptyLabel="아직 등록된 관심사가 없어요"
              onRemove={(item) =>
                setInterests((current) =>
                  current.filter((value) => value !== item)
                )
              }
            />
            <ContextSection
              title="여행 조건"
              items={constraints}
              emptyLabel="아직 등록된 조건이 없어요"
              onRemove={(item) =>
                setConstraints((current) =>
                  current.filter((value) => value !== item)
                )
              }
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
                  {card.category}
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
  emptyLabel,
  onRemove,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
  onRemove: (item: string) => void;
}) => (
  <section className="border-b px-5 py-5">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <span className="text-[11px] text-muted-foreground">
        {items.length}/20
      </span>
    </div>
    {items.length ? (
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 rounded-full bg-primary/8 py-1.5 pl-3 pr-1.5 text-xs font-medium text-primary"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="rounded-full p-0.5 hover:bg-primary/10"
              aria-label={`${item} 삭제`}
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

export default ChatPrototypePage;
