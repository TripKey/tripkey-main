// SelectCardDetailPanel — "선택이 필요한 카드들"상세보기 사이드 패널

import { Clock, Info, MapPin, User, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import PanelActions from '@/components/common/PanelActions';
import SidePanel from '@/components/common/SidePanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { PlaceCardViewModel } from '@/types/grouping';

import {
  AnswerField,
  DetailRow,
  ItineraryInclusionBox,
  QuestionBox,
  StatusInfoBox,
  UserMemoField,
} from './CardDetailParts';
import PlaceCardBadge from './PlaceCardBadge';

type SelectCardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PlaceCardViewModel | null;
  onConfirm?: (payload: { choices: string[]; answer: string }) => void;
  onExclude?: () => void;
  onSaveMemo?: (memo: string) => void;
};

const SelectCardDetailPanel = ({
  open,
  onOpenChange,
  card,
  onConfirm,
  onExclude,
  onSaveMemo,
}: SelectCardDetailPanelProps) => {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      {card?.selectDetail ? (
        <SelectCardDetailBody
          key={card.id}
          card={card}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
          onExclude={onExclude}
          onSaveMemo={onSaveMemo}
        />
      ) : null}
    </SidePanel>
  );
};

export default SelectCardDetailPanel;

//패널 본문
const SelectCardDetailBody = ({
  card,
  onClose,
  onConfirm,
  onExclude,
  onSaveMemo,
}: {
  card: PlaceCardViewModel;
  onClose: () => void;
  onConfirm?: (payload: { choices: string[]; answer: string }) => void;
  onExclude?: () => void;
  onSaveMemo?: (memo: string) => void;
}) => {
  const detail = card.selectDetail!;

  const [selectedChoices, setSelectedChoices] = useState<string[]>(
    detail.selectedChoices ?? []
  );
  const [answer, setAnswer] = useState(detail.answer ?? '');

  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();

  const canConfirm = selectedChoices.length > 0 || answer.trim().length > 0;

  const toggleChoice = (choice: string) =>
    setSelectedChoices((prev) =>
      prev.includes(choice)
        ? prev.filter((value) => value !== choice)
        : [...prev, choice]
    );

  const categoryBadge = card.badges?.find((badge) => badge.kind === 'category');
  const hint = detail.aiHint ?? card.reminder;

  return (
    <>
      {/*헤더*/}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlaceCardBadge
              kind="status"
              label={detail.classification}
              tone="pending"
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
        <Dialog.Title className="mt-3 text-xl font-bold text-foreground">
          {card.name}
        </Dialog.Title>
        <Dialog.Description className="sr-only">
          {card.name} 카드의 상태·상세 정보, 선택 질문, 사용자 메모
        </Dialog.Description>
      </div>

      <Separator />

      {/*본문*/}
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {/* 상태 정보 박스(회색) */}
        <StatusInfoBox
          classification={detail.classification}
          placementStatus={detail.placementStatus}
        />

        {/* 상세 정보: 위치 / 예상 소요 시간 / 원하셨던 내용 / 알아두면 좋아요 — review 패널과 공통 */}
        <section>
          <h3 className="text-sm font-semibold text-foreground">상세 정보</h3>
          <ul className="mt-3 space-y-3.5">
            {card.region && (
              <DetailRow icon={MapPin} label="위치" value={card.region} />
            )}
            {card.durationLabel && (
              <DetailRow
                icon={Clock}
                label="예상 소요 시간"
                value={card.durationLabel}
              />
            )}
            {detail.userIntent && (
              <DetailRow
                icon={User}
                label="원하셨던 내용"
                value={detail.userIntent}
              />
            )}
            {hint && (
              <DetailRow
                icon={Info}
                label="알아두면 좋아요"
                value={hint}
                emphasis
              />
            )}
          </ul>
        </section>

        <Separator />

        {/* 질문 / 입력 */}
        <section>
          <h3 className="text-sm font-semibold text-foreground">질문 / 입력</h3>

          {/* AI 질문 */}
          <QuestionBox question={detail.question} />

          {/* 선택지 칩(다중 선택 토글)  */}
          {detail.choices.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.choices.map((choice) => {
                const active = selectedChoices.includes(choice);
                return (
                  <button
                    key={choice}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleChoice(choice)}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm transition-colors',
                      active
                        ? 'border-indigo-300 bg-indigo-50 font-medium text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                        : 'border-input bg-background text-foreground hover:border-muted-foreground/30 hover:bg-muted/50'
                    )}
                  >
                    {choice}
                  </button>
                );
              })}
            </div>
          )}

          {/* 질문에 대한 답변(공통 ui */}
          <AnswerField
            value={answer}
            onChange={setAnswer}
            placeholder="선택한 내용 외에 더 남기고 싶은 내용을 적어주세요..."
          />
        </section>

        <Separator />

        {/* 사용자 메모 */}
        <UserMemoField value={memo} onChange={setMemo} />

        {/* 일정 포함 박스(회색)*/}
        {detail.includedInItinerary && (
          <>
            <Separator />
            <ItineraryInclusionBox onExclude={onExclude} />
          </>
        )}
      </div>

      {/*푸터*/}
      <PanelActions>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-sm"
          onClick={onClose}
        >
          닫기
        </Button>
        <Button
          type="button"
          className="h-11 flex-1 text-sm font-semibold"
          disabled={!canConfirm}
          onClick={() =>
            onConfirm?.({ choices: selectedChoices, answer: answer.trim() })
          }
        >
          확인하기
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-sm font-semibold"
          disabled={!memoDirty}
          onClick={() => onSaveMemo?.(memo)}
        >
          메모 저장
        </Button>
      </PanelActions>
    </>
  );
};
