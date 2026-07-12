import {
  ArrowLeft,
  ArrowUp,
  Bot,
  Check,
  CloudRain,
  Coffee,
  Copy,
  ExternalLink,
  MapPin,
  ShoppingBag,
  Trash2,
  UserRound,
  Utensils,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

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
import type {
  ChatIntent,
  ChatSuggestedCard,
  ChatSuggestedCardPayload,
} from '@/types/chat-api';
import type { Card, CardCategory } from '@/types/grouping-api';
import { chatErrorMessage, parseChat, saveChatCards } from '@/utils/chat-api';
import {
  CHAT_CONSTRAINT_OPTIONS,
  CHAT_INTEREST_OPTIONS,
  chatContextLabel,
} from '@/utils/chat-context';
import type { ChatContextOption } from '@/utils/chat-context';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  suggestions?: ChatSuggestedCard[];
  duplicates?: string[];
  intent?: ChatIntent;
  action?: {
    label: string;
    type: 'close';
  };
};

type ChatAssistantDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
  destination?: string;
  savedActionLabel?: string;
  onCardsCreated: (cards: Card[]) => Promise<void> | void;
  onBack?: () => void;
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

const googleMapsPlaceUrl = (card: ChatSuggestedCardPayload) =>
  `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
    card.place_id
  )}&query=${encodeURIComponent(
    [card.name, card.location, card.address].filter(Boolean).join(' ')
  )}`;

const ChatAssistantDialog = ({
  open,
  onOpenChange,
  tripId,
  destination = '여행지',
  savedActionLabel = '목록에서 확인하기',
  onCardsCreated,
  onBack,
}: ChatAssistantDialogProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [constraints, setConstraints] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<ChatSuggestedCard[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isReplying, setIsReplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedCandidates = useMemo(
    () =>
      candidates.filter((candidate) => selectedIds.has(candidate.candidate_id)),
    [candidates, selectedIds]
  );

  useEffect(() => {
    if (!open || messages.length > 0) return;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: `${destination} 여행에 더하고 싶은 장소나 조건을 알려주세요. 추천 후보를 확인한 뒤 필요한 카드만 추가할 수 있어요.`,
      },
    ]);
  }, [destination, messages.length, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isReplying, messages]);

  const confirmDiscardCandidates = () => {
    if (candidates.length === 0) return true;
    return window.confirm(
      `저장하지 않은 추천 후보 ${candidates.length}개가 있어요. 닫으면 후보가 사라집니다.`
    );
  };

  const clearCandidates = () => {
    setCandidates([]);
    setSelectedIds(new Set());
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      if (!confirmDiscardCandidates()) return;
      clearCandidates();
    }
    onOpenChange(nextOpen);
  };

  const handleBack = () => {
    if (!confirmDiscardCandidates()) return;
    clearCandidates();
    onBack?.();
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
      setCandidates((current) => {
        const knownPlaceIds = new Set(
          current.map((item) => item.card.place_id)
        );
        return [
          ...current,
          ...response.suggested_cards.filter(
            (item) => !knownPlaceIds.has(item.card.place_id)
          ),
        ];
      });
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
          suggestions: response.suggested_cards,
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

  const saveSelected = async () => {
    if (!tripId || selectedCandidates.length === 0 || isSaving) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const response = await saveChatCards(tripId, {
        cards: selectedCandidates,
      });
      const handledPlaceIds = new Set([
        ...response.created_cards.map((card) => card.place_id),
        ...selectedCandidates
          .filter((candidate) =>
            response.duplicates.some(
              (duplicate) => duplicate.name === candidate.card.name
            )
          )
          .map((candidate) => candidate.card.place_id),
      ]);
      setCandidates((current) =>
        current.filter(
          (candidate) => !handledPlaceIds.has(candidate.card.place_id)
        )
      );
      setSelectedIds(new Set());
      if (response.created_cards.length > 0) {
        await onCardsCreated(response.created_cards);
      }
      const duplicateSuffix = response.duplicates.length
        ? ` 중복 ${response.duplicates.length}개는 제외했어요.`
        : '';
      setMessages((current) => [
        ...current,
        {
          id: `saved-${Date.now()}`,
          role: 'assistant',
          text: `${response.created_cards.length}개의 카드를 목록에 추가했어요.${duplicateSuffix}`,
          action: {
            label: savedActionLabel,
            type: 'close',
          },
        },
      ]);
    } catch (error) {
      setErrorMessage(chatErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const toggleCandidate = (candidateId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(candidateId)) next.delete(candidateId);
      else next.add(candidateId);
      return next;
    });
  };

  const removeCandidate = (candidateId: string) => {
    setCandidates((current) =>
      current.filter((candidate) => candidate.candidate_id !== candidateId)
    );
    setSelectedIds((current) => {
      const next = new Set(current);
      next.delete(candidateId);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="h-[min(780px,calc(100vh-2rem))] max-w-[980px] grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-[980px]">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          {onBack && (
            <button
              type="button"
              onClick={handleBack}
              className="mb-3 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              추가 방식 선택
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle>AI에게 카드 요청하기</DialogTitle>
              <DialogDescription className="mt-1">
                추천 후보를 비교하고 필요한 카드만 목록에 추가하세요.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid min-h-0 grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
          <section className="flex min-h-0 flex-col md:border-r">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 space-y-5 overflow-y-auto bg-muted/25 px-6 py-5"
            >
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onAction={() => handleOpenChange(false)}
                />
              ))}
              {isReplying && <ReplyingIndicator />}
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

          <aside className="flex min-h-0 flex-col bg-background">
            <div className="border-b px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">추천 후보</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {candidates.length}개 중 {selectedCandidates.length}개 선택
                  </p>
                </div>
                <Badge variant="secondary">{candidates.length}</Badge>
              </div>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {candidates.length > 0 ? (
                candidates.map((candidate) => (
                  <CandidateItem
                    key={candidate.candidate_id}
                    candidate={candidate}
                    selected={selectedIds.has(candidate.candidate_id)}
                    onToggle={() => toggleCandidate(candidate.candidate_id)}
                    onRemove={() => removeCandidate(candidate.candidate_id)}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
                  <p className="text-xs font-medium text-muted-foreground">
                    아직 추천 후보가 없어요
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    원하는 장소나 조건을 대화로 알려주세요.
                  </p>
                </div>
              )}
              <ContextSummary
                title="관심사"
                items={interests}
                options={CHAT_INTEREST_OPTIONS}
              />
              <ContextSummary
                title="여행 조건"
                items={constraints}
                options={CHAT_CONSTRAINT_OPTIONS}
              />
            </div>
            <div className="border-t p-4">
              <Button
                className="w-full"
                disabled={selectedCandidates.length === 0 || isSaving}
                onClick={saveSelected}
              >
                {isSaving
                  ? '추가하는 중…'
                  : `선택한 카드 ${selectedCandidates.length}개 추가`}
              </Button>
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                선택한 카드만 실제 카드 목록에 저장돼요.
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

const ReplyingIndicator = () => (
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
);

const MessageBubble = ({
  message,
  onAction,
}: {
  message: ChatMessage;
  onAction: () => void;
}) => {
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
        {message.suggestions?.map((candidate) => (
          <RecommendationCard
            key={candidate.candidate_id}
            card={candidate.card}
          />
        ))}
        {message.action && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8"
            onClick={onAction}
          >
            {message.action.label}
          </Button>
        )}
      </div>
      {isUser && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <UserRound className="size-4" aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

const RecommendationCard = ({ card }: { card: ChatSuggestedCardPayload }) => (
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
        <LocationLine card={card} />
      </div>
      <span className="shrink-0 text-[11px] font-medium text-primary">
        추천됨
      </span>
    </div>
    <GoogleMapsLink card={card} className="mt-3" />
  </article>
);

const CandidateItem = ({
  candidate,
  selected,
  onToggle,
  onRemove,
}: {
  candidate: ChatSuggestedCard;
  selected: boolean;
  onToggle: () => void;
  onRemove: () => void;
}) => (
  <article
    className={cn(
      'rounded-xl border p-3 transition-colors',
      selected && 'border-primary/40 bg-primary/5'
    )}
  >
    <div className="flex items-start gap-2.5">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border',
          selected
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border bg-background'
        )}
        aria-label={`${candidate.card.name} ${selected ? '선택 해제' : '선택'}`}
      >
        {selected && <Check className="size-3.5" aria-hidden="true" />}
      </button>
      <button
        type="button"
        onClick={onToggle}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-semibold">{candidate.card.name}</p>
        <LocationLine card={candidate.card} />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
        aria-label={`${candidate.card.name} 후보에서 제거`}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </button>
    </div>
    <GoogleMapsLink card={candidate.card} className="mt-2 pl-7" />
  </article>
);

const GoogleMapsLink = ({
  card,
  className,
}: {
  card: ChatSuggestedCardPayload;
  className?: string;
}) => (
  <a
    href={googleMapsPlaceUrl(card)}
    target="_blank"
    rel="noreferrer"
    onClick={(event) => event.stopPropagation()}
    className={cn(
      'inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline',
      className
    )}
  >
    지도에서 보기
    <ExternalLink className="size-3" aria-hidden="true" />
  </a>
);

const LocationLine = ({ card }: { card: ChatSuggestedCardPayload }) => {
  const location = [card.location, card.address].filter(Boolean).join(' · ');
  return (
    <p className="mt-1 truncate text-xs text-muted-foreground" title={location}>
      {location || '위치 정보 확인됨'}
    </p>
  );
};

const ContextSummary = ({
  title,
  items,
  options,
}: {
  title: string;
  items: string[];
  options: ChatContextOption[];
}) => (
  <section className="mt-4 border-t pt-4">
    <div className="flex items-center justify-between">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      <span className="text-[11px] text-muted-foreground">{items.length}</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      {items.length > 0 ? (
        items.map((item) => (
          <Badge key={item} variant="secondary" className="font-normal">
            {chatContextLabel(item, options)}
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
