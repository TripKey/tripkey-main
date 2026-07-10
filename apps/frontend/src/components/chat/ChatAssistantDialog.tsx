import {
  ArrowUp,
  Bot,
  Check,
  CloudRain,
  Coffee,
  Copy,
  MapPin,
  ShoppingBag,
  UserRound,
  Utensils,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ChatIntent } from '@/types/chat-api';
import type { Card, CardCategory } from '@/types/grouping-api';
import { chatErrorMessage, parseChat } from '@/utils/chat-api';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  cards?: Card[];
  duplicates?: string[];
  intent?: ChatIntent;
};

type ChatAssistantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
  destination?: string;
  onCardsCreated: (cards: Card[]) => Promise<void> | void;
};

const SUGGESTIONS = [
  { label: '비 오는 날 실내 장소', icon: CloudRain },
  { label: '근처 디저트 카페', icon: Coffee },
  { label: '현지인 맛집 추천', icon: Utensils },
  { label: '쇼핑할 곳 더 찾아줘', icon: ShoppingBag },
];

const CATEGORY_LABELS: Record<CardCategory, string> = {
  place: '장소',
  activity: '활동',
  transport: '교통',
  accommodation: '숙소',
  food: '맛집',
  etc: '기타',
};

const ChatAssistantDialog = ({
  open,
  onOpenChange,
  tripId,
  destination = '여행지',
  onCardsCreated,
}: ChatAssistantDialogProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [isReplying, setIsReplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || messages.length > 0) return;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `${destination} 여행에 더하고 싶은 장소나 조건을 알려주세요. 추천 결과는 현재 카드 목록에 바로 추가해드릴게요.`,
      },
    ]);
  }, [destination, messages.length, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isReplying, messages]);

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
      if (response.created_cards.length > 0) {
        await onCardsCreated(response.created_cards);
      }
    } catch (error) {
      setErrorMessage(chatErrorMessage(error));
    } finally {
      setIsReplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[min(760px,calc(100vh-2rem))] max-w-[900px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[900px]">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>AI로 카드 더 찾기</DialogTitle>
              <DialogDescription className="mt-1">
                정리 중 부족한 장소를 대화로 보완해보세요. 추천 카드는 자동
                저장돼요.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1fr)_240px]">
          <section className="flex min-h-0 flex-col md:border-r">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-muted/25 px-6 py-5"
            >
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isReplying && (
                <div className="flex items-start gap-3">
                  <BotAvatar />
                  <div className="flex h-10 items-center gap-1 rounded-2xl rounded-tl-md border bg-background px-4">
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
              <div className="mx-4 mt-3 rounded-lg border border-destructive/25 bg-destructive/8 px-4 py-3 text-xs text-destructive">
                {errorMessage}
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
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-end gap-2 rounded-xl border p-2 pl-4 shadow-xs focus-within:border-primary/50">
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
                  placeholder="예: 숙소 근처에서 갈 만한 야경 장소를 더 찾아줘"
                  className="max-h-28 min-h-11 flex-1 resize-none bg-transparent py-2 text-sm outline-none"
                />
                <Button
                  size="icon"
                  className="size-10 shrink-0"
                  disabled={!input.trim() || isReplying || !tripId}
                  onClick={() => submitMessage()}
                  aria-label="메시지 보내기"
                >
                  <ArrowUp className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </section>

          <aside className="hidden overflow-y-auto bg-background p-5 md:block">
            <p className="text-sm font-semibold">대화에 반영된 맥락</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              대화에서 파악한 취향과 조건을 다음 추천에도 이어서 반영해요.
            </p>
            <ContextSummary title="관심사" items={interests} />
            <ContextSummary title="여행 조건" items={constraints} />
            <div className="mt-6 rounded-xl border border-dashed bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Check className="size-3.5 text-primary" aria-hidden="true" />
                기존 카드와 함께 정리
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                새 카드는 현재 03 화면에 추가됩니다. 중복 장소는 새로 만들지
                않아요.
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
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
      <div className={cn('max-w-[88%] space-y-3', isUser && 'items-end')}>
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
            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950"
          >
            <Copy className="size-3.5 text-amber-600" aria-hidden="true" />
            <span className="flex-1">{name}</span>
            <Badge className="bg-amber-100 text-amber-800">이미 있음</Badge>
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

const RecommendationCard = ({ card }: { card: Card }) => (
  <article className="rounded-xl border bg-background p-3 shadow-xs">
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MapPin className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{card.name}</p>
          <Badge variant="secondary" className="text-[10px]">
            {CATEGORY_LABELS[card.category]}
          </Badge>
        </div>
        <p
          className="mt-1 truncate text-xs text-muted-foreground"
          title={[card.location, card.address].filter(Boolean).join(' · ')}
        >
          {[card.location, card.address].filter(Boolean).join(' · ') ||
            '위치 정보 확인됨'}
        </p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-primary">
        <Check className="size-3" aria-hidden="true" /> 저장됨
      </span>
    </div>
  </article>
);

const ContextSummary = ({
  title,
  items,
}: {
  title: string;
  items: string[];
}) => (
  <section className="mt-5">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      <span className="text-[11px] text-muted-foreground">{items.length}</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.length > 0 ? (
        items.map((item) => (
          <Badge key={item} variant="secondary" className="font-normal">
            {item}
          </Badge>
        ))
      ) : (
        <span className="text-xs text-muted-foreground">
          대화로 추가해보세요
        </span>
      )}
    </div>
  </section>
);

export default ChatAssistantDialog;
