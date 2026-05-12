// EditCardDetailPanel — "수정이 필요한 카드들"상세보기 사이드 패널

import { Clock, Info, MapPin, User, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import Callout from '@/components/common/Callout';
import PanelActions from '@/components/common/PanelActions';
import SidePanel from '@/components/common/SidePanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { PlaceCardViewModel } from '@/types/grouping';

import {
  AnswerField,
  DetailRow,
  QuestionBox,
  StatusInfoBox,
  UserMemoField,
} from './CardDetailParts';
import PlaceCardBadge from './PlaceCardBadge';

type EditCardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  card: PlaceCardViewModel | null;
  onConfirm?: (payload: { answer: string }) => void;
  onSaveMemo?: (memo: string) => void;
};

const EditCardDetailPanel = ({
  open,
  onOpenChange,
  card,
  onConfirm,
  onSaveMemo,
}: EditCardDetailPanelProps) => {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      {card?.editDetail ? (
        // key={card.id}: 다른 카드로 다시 열렸을 때 답변/메모 입력 state 가 초기화
        <EditCardDetailBody
          key={card.id}
          card={card}
          onClose={() => onOpenChange(false)}
          onConfirm={onConfirm}
          onSaveMemo={onSaveMemo}
        />
      ) : null}
    </SidePanel>
  );
};

export default EditCardDetailPanel;

//패널 본문(헤더 + 스크롤 영역 + 푸터)
const EditCardDetailBody = ({
  card,
  onClose,
  onConfirm,
  onSaveMemo,
}: {
  card: PlaceCardViewModel;
  onClose: () => void;
  onConfirm?: (payload: { answer: string }) => void;
  onSaveMemo?: (memo: string) => void;
}) => {
  const detail = card.editDetail!;

  //입력 state(패널 로컬)

  // "질문에 대한 답변"(보정 내용)
  const [answer, setAnswer] = useState(detail.answer ?? '');

  // 사용자 메모
  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();

  // "확인하기"
  const canConfirm = answer.trim().length > 0;

  const moreBadge = card.badges?.find((badge) => badge.kind === 'more');
  const hint = detail.aiHint ?? card.reminder;
  // "상세 정보"
  const hasDetailRows = Boolean(
    card.region || card.durationLabel || detail.userIntent || hint
  );

  return (
    <>
      {/*헤더(고정)*/}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlaceCardBadge kind="status" label="질문 필요" tone="info" />
            {moreBadge && <PlaceCardBadge {...moreBadge} />}
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
          {card.name} 카드의 배치 불가 안내, 상태·상세 정보, 보정 질문, 사용자
          메모
        </Dialog.Description>
      </div>

      <Separator />

      {/*본문(스크롤 영역)*/}
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {/* 빨강 알림 배너 */}
        <div className="space-y-3">
          <Callout
            tone="error"
            title="해결이 필요합니다"
            footer={detail.reason ? `사유: ${detail.reason}` : undefined}
          >
            이 항목은 배치할 수 없습니다
          </Callout>
          {detail.retryNotice && (
            <Callout tone="error" title="처리 중 오류가 발생했습니다">
              {detail.retryNotice}
            </Callout>
          )}
        </div>

        {/* 상태 정보 박스(회색)*/}
        <StatusInfoBox
          classification={detail.classification}
          placementStatus={detail.placementStatus}
        />

        {/* 상세 정보 */}
        {hasDetailRows && (
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
        )}

        <Separator />

        {/* 질문 / 입력 */}
        <section>
          <h3 className="text-sm font-semibold text-foreground">질문 / 입력</h3>
          <QuestionBox question={detail.question} />
          <AnswerField
            value={answer}
            onChange={setAnswer}
            placeholder="필요한 내용을 자유롭게 입력해주세요..."
          />
        </section>

        <Separator />

        {/* 사용자 메모  */}
        <UserMemoField value={memo} onChange={setMemo} />
      </div>

      {/* 푸터(고정) */}
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
          onClick={() => onConfirm?.({ answer: answer.trim() })}
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
