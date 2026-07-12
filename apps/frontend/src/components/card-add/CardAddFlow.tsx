import { ArrowRight, Keyboard, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import ChatAssistantDialog from '@/components/chat/ChatAssistantDialog';
import AddCardModal from '@/components/grouping/AddCardModal';
import type { AddCardDraft } from '@/components/grouping/AddCardModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Card } from '@/types/grouping-api';

type AddMethod = 'select' | 'manual' | 'ai';

type CardAddFlowProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string | null;
  destination?: string;
  tripStartDate?: string | null;
  travelDays?: number | null;
  onManualSubmit: (draft: AddCardDraft) => void;
  onAiCardsCreated: (cards: Card[]) => Promise<void> | void;
};

const CardAddFlow = ({
  open,
  onOpenChange,
  tripId,
  destination,
  tripStartDate,
  travelDays,
  onManualSubmit,
  onAiCardsCreated,
}: CardAddFlowProps) => {
  const [method, setMethod] = useState<AddMethod>('select');

  useEffect(() => {
    if (!open) setMethod('select');
  }, [open]);

  const closeFlow = () => onOpenChange(false);

  return (
    <>
      <Dialog
        open={open && method === 'select'}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeFlow();
        }}
      >
        <DialogContent className="max-w-xl gap-0 p-0 sm:max-w-xl">
          <DialogHeader className="border-b px-6 py-6 pr-14">
            <DialogTitle className="text-xl">카드 추가하기</DialogTitle>
            <DialogDescription className="mt-1">
              알고 있는 정보를 직접 입력하거나, AI와 대화하며 장소를 추천받을 수
              있어요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 p-6 sm:grid-cols-2">
            <MethodCard
              icon={Keyboard}
              title="직접 입력"
              description="추가할 장소, 숙소, 교통편이나 예약 정보를 알고 있어요."
              onClick={() => setMethod('manual')}
            />
            <MethodCard
              icon={Sparkles}
              title="AI에게 요청"
              description="원하는 장소나 여행 조건을 말하고 추천 후보를 비교해요."
              onClick={() => setMethod('ai')}
              accent
            />
          </div>
        </DialogContent>
      </Dialog>

      <AddCardModal
        open={open && method === 'manual'}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeFlow();
        }}
        tripStartDate={tripStartDate}
        travelDays={travelDays}
        onSubmit={onManualSubmit}
        manualOnly
        onBack={() => setMethod('select')}
      />

      <ChatAssistantDialog
        open={open && method === 'ai'}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) closeFlow();
        }}
        tripId={tripId}
        destination={destination}
        onCardsCreated={onAiCardsCreated}
        onBack={() => setMethod('select')}
      />
    </>
  );
};

const MethodCard = ({
  icon: Icon,
  title,
  description,
  onClick,
  accent = false,
}: {
  icon: typeof Keyboard;
  title: string;
  description: string;
  onClick: () => void;
  accent?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex min-h-44 flex-col rounded-2xl border bg-background p-5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
  >
    <span
      className={`flex size-11 items-center justify-center rounded-xl ${
        accent
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-foreground'
      }`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
    <span className="mt-5 text-base font-semibold text-foreground">
      {title}
    </span>
    <span className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">
      {description}
    </span>
    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
      선택하기
      <ArrowRight
        className="size-4 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </span>
  </button>
);

export default CardAddFlow;
