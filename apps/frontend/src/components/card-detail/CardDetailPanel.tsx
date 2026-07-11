import { Clock, Info, MapPin, Plane, User, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import PanelActions from '@/components/common/PanelActions';
import PlaceLocationMap from '@/components/common/PlaceLocationMap';
import SidePanel from '@/components/common/SidePanel';
import {
  AnswerField,
  DetailRow,
  ItineraryInclusionBox,
  QuestionBox,
  StructuredEditSection,
  UserMemoField,
} from '@/components/grouping/CardDetailParts';
import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PlaceCardAccent, PlaceCardBadgeSpec } from '@/types/grouping';
import type { CardPatchRequest } from '@/types/grouping-api';

export type CommonCardDetailViewModel = {
  classification: string;
  placementStatus: string;
  fixedTimeLabel?: string;
  region?: string;
  durationLabel?: string;
  estimatedDurationMin?: number | null;
  userIntent?: string;
  aiHint?: string;
  coordinates?: { lat: number; lng: number };
  includedInItinerary?: boolean;
  memo?: string;
  question?: string;
  choices?: string[];
  selectedChoices?: string[];
  answer?: string;
  canResolveByNotes?: boolean;
  canResolveByStructuredEdit?: boolean;
  structuredEditCategory?: 'accommodation' | 'transport';
  structuredFields?: {
    location?: string;
    checkIn?: string;
    checkOut?: string;
    timeConstraint?: string;
    flightNumber?: string;
  };
  canSelectProcess?: boolean;
  selectProcessNotes?: string;
};

export type CommonCardDetailCard = {
  id: string;
  name: string;
  accent?: PlaceCardAccent;
  badges?: PlaceCardBadgeSpec[];
  draggable?: boolean;
  actionGuide?: string;
  detail?: CommonCardDetailViewModel;
};

export type CommonCardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CommonCardDetailCard | null;
  onSaveMemo?: (memo: string) => void;
  onSaveDisplay?: (payload: CardPatchRequest) => void;
  onExclude?: () => void;
  onInclude?: () => void;
  onConfirmSelection?: (payload: { choices: string[]; answer: string }) => void;
  onResolveByStructuredEdit?: (args: {
    payload: CardPatchRequest;
    locationChanged: boolean;
  }) => void;
  onSelectProcess?: () => void;
  resolving?: boolean;
  resolveError?: string | null;
};

const CardDetailPanel = ({
  open,
  onOpenChange,
  card,
  onSaveMemo,
  onSaveDisplay,
  onExclude,
  onInclude,
  onConfirmSelection,
  onResolveByStructuredEdit,
  onSelectProcess,
  resolving = false,
  resolveError = null,
}: CommonCardDetailPanelProps) => {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      {card?.detail ? (
        <CardDetailBody
          key={card.id}
          card={card}
          onClose={() => onOpenChange(false)}
          onSaveMemo={onSaveMemo}
          onSaveDisplay={onSaveDisplay}
          onExclude={onExclude}
          onInclude={onInclude}
          onConfirmSelection={onConfirmSelection}
          onResolveByStructuredEdit={onResolveByStructuredEdit}
          onSelectProcess={onSelectProcess}
          resolving={resolving}
          resolveError={resolveError}
        />
      ) : null}
    </SidePanel>
  );
};

export default CardDetailPanel;

const CardDetailBody = ({
  card,
  onClose,
  onSaveMemo,
  onSaveDisplay,
  onExclude,
  onInclude,
  onConfirmSelection,
  onResolveByStructuredEdit,
  onSelectProcess,
  resolving,
  resolveError,
}: {
  card: CommonCardDetailCard;
  onClose: () => void;
  onSaveMemo?: (memo: string) => void;
  onSaveDisplay?: (payload: CardPatchRequest) => void;
  onExclude?: () => void;
  onInclude?: () => void;
  onConfirmSelection?: (payload: { choices: string[]; answer: string }) => void;
  onResolveByStructuredEdit?: (args: {
    payload: CardPatchRequest;
    locationChanged: boolean;
  }) => void;
  onSelectProcess?: () => void;
  resolving: boolean;
  resolveError: string | null;
}) => {
  const detail = card.detail!;
  const included = detail.includedInItinerary !== false;
  const isFixed = card.draggable === false;
  const hasActionGuide = card.actionGuide != null;
  const canStructuredEdit = detail.canResolveByStructuredEdit === true;
  const hasQuestion = Boolean(detail.question);
  const showConfirmButton = canStructuredEdit || hasQuestion;

  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();
  const initialName = card.name;
  const initialDuration = detail.estimatedDurationMin;
  const [editingDisplay, setEditingDisplay] = useState(false);
  const [displayName, setDisplayName] = useState(initialName);
  const [durationMinutes, setDurationMinutes] = useState(
    initialDuration == null ? '' : String(initialDuration)
  );
  const normalizedDisplayName = displayName.trim();
  const parsedDuration =
    durationMinutes.trim() === ''
      ? undefined
      : Number.parseInt(durationMinutes, 10);
  const validDuration =
    parsedDuration === undefined ||
    (Number.isFinite(parsedDuration) && parsedDuration >= 0);
  const displayDirty =
    normalizedDisplayName !== initialName.trim() ||
    (durationMinutes.trim() === ''
      ? initialDuration != null
      : parsedDuration !== initialDuration);
  const canSaveDisplay =
    editingDisplay &&
    !resolving &&
    normalizedDisplayName.length > 0 &&
    validDuration &&
    displayDirty;

  const [selectedChoices, setSelectedChoices] = useState<string[]>(
    detail.selectedChoices ?? []
  );
  const [answer, setAnswer] = useState(detail.answer ?? '');

  const sf = detail.structuredFields;
  const [location, setLocation] = useState(sf?.location ?? '');
  const [checkIn, setCheckIn] = useState(sf?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(sf?.checkOut ?? '');
  const [timeConstraint, setTimeConstraint] = useState(
    sf?.timeConstraint ?? ''
  );
  const [flightNumber, setFlightNumber] = useState(sf?.flightNumber ?? '');

  const locationChanged = location.trim() !== (sf?.location ?? '').trim();
  const structuredDirty =
    locationChanged ||
    checkIn.trim() !== (sf?.checkIn ?? '').trim() ||
    checkOut.trim() !== (sf?.checkOut ?? '').trim() ||
    timeConstraint.trim() !== (sf?.timeConstraint ?? '').trim() ||
    flightNumber.trim() !== (sf?.flightNumber ?? '').trim();

  const canConfirm =
    (structuredDirty ||
      selectedChoices.length > 0 ||
      answer.trim().length > 0) &&
    !resolving;

  const categoryBadge = card.badges?.find((badge) => badge.kind === 'category');
  const toggleChoice = (choice: string) =>
    setSelectedChoices((prev) => (prev.includes(choice) ? [] : [choice]));

  const handleConfirm = () => {
    if (structuredDirty) {
      const payload: CardPatchRequest = {};
      if (location.trim()) payload.location = location.trim();
      if (detail.structuredEditCategory === 'accommodation') {
        if (checkIn.trim()) payload.check_in = checkIn.trim();
        if (checkOut.trim()) payload.check_out = checkOut.trim();
      } else if (detail.structuredEditCategory === 'transport') {
        if (timeConstraint.trim())
          payload.time_constraint = timeConstraint.trim();
        if (flightNumber.trim()) payload.flight_number = flightNumber.trim();
      }
      onResolveByStructuredEdit?.({ payload, locationChanged });
    } else if (hasQuestion) {
      onConfirmSelection?.({
        choices: selectedChoices,
        answer: answer.trim(),
      });
    }
  };

  const resetDisplayEdit = () => {
    setDisplayName(initialName);
    setDurationMinutes(initialDuration == null ? '' : String(initialDuration));
    setEditingDisplay(false);
  };

  const handleSaveDisplay = () => {
    if (!canSaveDisplay) return;
    const payload: CardPatchRequest = {
      name: normalizedDisplayName,
    };
    if (parsedDuration !== undefined) {
      payload.estimated_duration_min = parsedDuration;
    }
    onSaveDisplay?.(payload);
  };

  return (
    <>
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlaceCardBadge
              kind="status"
              label={detail.classification}
              tone={isFixed ? 'info' : 'done'}
            />
            {categoryBadge && <PlaceCardBadge {...categoryBadge} />}
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="닫기"
              className="-mt-1 -mr-1.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </Dialog.Close>
        </div>
        <div className="mt-3 flex items-start gap-3">
          {editingDisplay ? (
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-xl font-bold text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
              aria-label="카드 이름"
            />
          ) : (
            <Dialog.Title className="min-w-0 flex-1 text-xl font-bold text-foreground">
              {card.name}
            </Dialog.Title>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-0.5 h-8 shrink-0 px-3 text-xs"
            disabled={resolving}
            onClick={() =>
              editingDisplay ? resetDisplayEdit() : setEditingDisplay(true)
            }
          >
            {editingDisplay ? '취소' : '수정'}
          </Button>
        </div>
        {editingDisplay && (
          <Dialog.Title className="sr-only">{card.name}</Dialog.Title>
        )}
        <Dialog.Description className="sr-only">
          {card.name} 카드의 상태·상세 정보와 사용자 메모
        </Dialog.Description>
      </div>

      <Separator />

      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        <section>
          <h3 className="text-sm font-semibold text-foreground">상세 정보</h3>
          <ul className="mt-3 space-y-3.5">
            {detail.fixedTimeLabel && (
              <DetailRow
                icon={Plane}
                label="고정 시작 시간"
                value={detail.fixedTimeLabel}
              />
            )}
            {detail.region && (
              <DetailRow icon={MapPin} label="위치" value={detail.region} />
            )}
            {editingDisplay ? (
              <li className="flex gap-3">
                <Clock
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <label className="text-xs text-muted-foreground">
                    예상 소요 시간
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step={5}
                      inputMode="numeric"
                      value={durationMinutes}
                      onChange={(event) =>
                        setDurationMinutes(event.target.value)
                      }
                      placeholder="예) 90"
                      className="h-10 w-28 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
                    />
                    <span className="text-sm text-muted-foreground">분</span>
                  </div>
                  {!validDuration && (
                    <p className="mt-1 text-xs text-destructive">
                      0 이상의 숫자로 입력해 주세요.
                    </p>
                  )}
                </div>
              </li>
            ) : (
              detail.durationLabel && (
                <DetailRow
                  icon={Clock}
                  label="예상 소요 시간"
                  value={detail.durationLabel}
                />
              )
            )}
            {detail.userIntent && (
              <DetailRow
                icon={User}
                label="원하셨던 내용"
                value={detail.userIntent}
              />
            )}
            {detail.aiHint && (
              <DetailRow
                icon={Info}
                label="알아두면 좋아요"
                value={detail.aiHint}
                emphasis
              />
            )}
          </ul>
          {detail.coordinates && (
            <div className="mt-3.5">
              <PlaceLocationMap
                lat={detail.coordinates.lat}
                lng={detail.coordinates.lng}
                name={card.name}
              />
            </div>
          )}
        </section>

        <Separator />

        {hasActionGuide && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="flex gap-2 text-sm leading-relaxed whitespace-pre-line text-amber-800 dark:text-amber-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{card.actionGuide}</span>
            </p>
          </div>
        )}

        {canStructuredEdit && detail.structuredEditCategory && (
          <>
            <StructuredEditSection
              category={detail.structuredEditCategory}
              location={location}
              onLocationChange={setLocation}
              checkIn={checkIn}
              onCheckInChange={setCheckIn}
              checkOut={checkOut}
              onCheckOutChange={setCheckOut}
              timeConstraint={timeConstraint}
              onTimeConstraintChange={setTimeConstraint}
              flightNumber={flightNumber}
              onFlightNumberChange={setFlightNumber}
              disabled={resolving || editingDisplay}
              canSelectProcess={detail.canSelectProcess}
              onSelectProcess={onSelectProcess}
            />
            <Separator />
          </>
        )}

        {hasQuestion && (
          <QuestionInputSection
            question={detail.question!}
            choices={detail.choices ?? []}
            selectedChoices={selectedChoices}
            onToggleChoice={toggleChoice}
            answer={answer}
            onAnswerChange={setAnswer}
            disabled={resolving || editingDisplay}
          />
        )}

        {resolveError && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-relaxed text-destructive"
          >
            {resolveError}
          </div>
        )}

        <UserMemoField value={memo} onChange={setMemo} />

        <Separator />
        <ItineraryInclusionBox
          included={included}
          onExclude={onExclude}
          onInclude={onInclude}
          disabled={editingDisplay}
        />
      </div>

      <PanelActions>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-sm"
          onClick={onClose}
        >
          닫기
        </Button>
        {showConfirmButton && (
          <Button
            type="button"
            className="h-11 flex-1 text-sm font-semibold"
            disabled={editingDisplay || !canConfirm}
            onClick={handleConfirm}
          >
            {resolving ? '재처리 중...' : '확인하기'}
          </Button>
        )}
        {editingDisplay && (
          <Button
            type="button"
            className="h-11 flex-1 text-sm font-semibold"
            disabled={!canSaveDisplay}
            onClick={handleSaveDisplay}
          >
            수정 저장
          </Button>
        )}
        {included && (
          <Button
            type="button"
            variant={showConfirmButton ? 'outline' : 'default'}
            className="h-11 flex-1 text-sm font-semibold"
            disabled={!memoDirty}
            onClick={() => onSaveMemo?.(memo)}
          >
            메모 저장
          </Button>
        )}
      </PanelActions>
    </>
  );
};

const QuestionInputSection = ({
  question,
  choices,
  selectedChoices,
  onToggleChoice,
  answer,
  onAnswerChange,
  disabled,
}: {
  question: string;
  choices: string[];
  selectedChoices: string[];
  onToggleChoice: (choice: string) => void;
  answer: string;
  onAnswerChange: (value: string) => void;
  disabled: boolean;
}) => (
  <section>
    <h3 className="text-sm font-semibold text-foreground">질문 / 입력</h3>
    <QuestionBox question={question} />

    {choices.length > 0 && (
      <div className="mt-3 flex flex-wrap gap-2">
        {choices.map((choice) => {
          const active = selectedChoices.includes(choice);
          return (
            <button
              key={choice}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onToggleChoice(choice)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm transition-colors disabled:opacity-50',
                active
                  ? 'border-primary/40 bg-primary/10 font-medium text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-primary'
                  : 'border-input bg-background text-foreground hover:border-muted-foreground/30 hover:bg-muted/50'
              )}
            >
              {choice}
            </button>
          );
        })}
      </div>
    )}

    <AnswerField
      value={answer}
      onChange={onAnswerChange}
      placeholder="선택한 내용 외에 더 남기고 싶은 내용을 적어주세요..."
      disabled={disabled}
    />
  </section>
);
