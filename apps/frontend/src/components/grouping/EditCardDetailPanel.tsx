// EditCardDetailPanel — "수정이 필요한 카드들" 상세보기 사이드 패널
//
// 숙소/교통 카드(canResolveByStructuredEdit): 구조화 편집 폼 + 선택처리 버튼 레이아웃
// 그 외 카드: 기존 질문/입력(QuestionBox + AnswerField) 레이아웃

import { Clock, Info, MapPin, User, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import Callout from '@/components/common/Callout';
import PanelActions from '@/components/common/PanelActions';
import SidePanel from '@/components/common/SidePanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { PlaceCardViewModel } from '@/types/grouping';
import type { CardPatchRequest } from '@/types/grouping-api';

import {
  AnswerField,
  DetailRow,
  QuestionBox,
  StatusInfoBox,
  StructuredEditSection,
  UserMemoField,
} from './CardDetailParts';
import PlaceCardBadge from './PlaceCardBadge';

type EditCardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: PlaceCardViewModel | null;
  onConfirm?: (payload: { answer: string }) => void;
  onSaveMemo?: (memo: string) => void;
  /** 처리필요 숙소/교통 카드의 구조화 필드 편집 → 저장(+위치 변경 시 재처리) */
  onResolveByStructuredEdit?: (args: {
    payload: CardPatchRequest;
    locationChanged: boolean;
  }) => void;
  /** notes 보완 입력 → 저장+재처리 */
  onResolveByNotes?: (notes: string) => void;
  /** 기존 location/name 을 notes 로 자동 전송해 AI 재처리 트리거 */
  onSelectProcess?: () => void;
  resolving?: boolean;
  resolveError?: string | null;
};

const EditCardDetailPanel = ({
  open,
  onOpenChange,
  card,
  onConfirm,
  onSaveMemo,
  onResolveByStructuredEdit,
  onResolveByNotes,
  onSelectProcess,
  resolving = false,
  resolveError = null,
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
          onResolveByStructuredEdit={onResolveByStructuredEdit}
          onResolveByNotes={onResolveByNotes}
          onSelectProcess={onSelectProcess}
          resolving={resolving}
          resolveError={resolveError}
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
  onResolveByStructuredEdit,
  onResolveByNotes,
  onSelectProcess,
  resolving,
  resolveError,
}: {
  card: PlaceCardViewModel;
  onClose: () => void;
  onConfirm?: (payload: { answer: string }) => void;
  onSaveMemo?: (memo: string) => void;
  onResolveByStructuredEdit?: (args: {
    payload: CardPatchRequest;
    locationChanged: boolean;
  }) => void;
  onResolveByNotes?: (notes: string) => void;
  onSelectProcess?: () => void;
  resolving: boolean;
  resolveError: string | null;
}) => {
  const detail = card.editDetail!;
  const canStructuredEdit = detail.canResolveByStructuredEdit === true;
  const isResolvable = detail.canResolveByNotes === true;

  // 질문/답변 패스 (비구조화 카드)
  const [answer, setAnswer] = useState(detail.answer ?? '');

  // 사용자 메모
  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();

  // 구조화 편집 필드 상태
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

  // notes 보완 섹션
  const [notes, setNotes] = useState(detail.notes ?? '');

  // 확인하기 활성 조건
  const canConfirmStructured =
    canStructuredEdit &&
    (structuredDirty || (isResolvable && notes.trim().length > 0)) &&
    !resolving;
  const canConfirmAnswer = !canStructuredEdit && answer.trim().length > 0;
  const canConfirm = canConfirmStructured || canConfirmAnswer;

  const moreBadge = card.badges?.find((badge) => badge.kind === 'more');
  const hint = detail.aiHint ?? card.reminder;
  const hasDetailRows = Boolean(
    card.region || card.durationLabel || detail.userIntent || hint
  );

  const handleConfirm = () => {
    if (canStructuredEdit) {
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
      } else if (isResolvable && notes.trim().length > 0) {
        onResolveByNotes?.(notes.trim());
      }
    } else {
      onConfirm?.({ answer: answer.trim() });
    }
  };

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

        {canStructuredEdit && detail.structuredEditCategory ? (
          // 숙소/교통 카드: 구조화 편집 레이아웃
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
              disabled={resolving}
              canSelectProcess={detail.canSelectProcess}
              onSelectProcess={onSelectProcess}
            />

            {/* 장소 정보 보완 섹션 */}
            {isResolvable && (
              <>
                <Separator />
                <section>
                  <h3 className="text-sm font-semibold text-foreground">
                    장소 정보 보완
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    장소명이나 주소를 더 정확히 입력하면 AI 가 다시 분석해 지도
                    위치를 찾아드려요.
                  </p>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={resolving}
                    placeholder="예) 도톤보리 글리코 사인 앞 / 오사카시 추오구 도톤보리 1-10-2"
                    rows={3}
                    className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60"
                  />
                  {structuredDirty && notes.trim().length > 0 && (
                    <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                      구조화 편집 중에는 장소 정보 보완을 함께 전송하지 않아요.
                      먼저 확인하기를 눌러 저장하세요.
                    </p>
                  )}
                </section>
              </>
            )}

            {/* 재처리 에러 안내 */}
            {resolveError && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm leading-relaxed text-destructive"
              >
                {resolveError}
              </div>
            )}
          </>
        ) : (
          // 그 외 카드: 기존 질문/입력 레이아웃
          <>
            <section>
              <h3 className="text-sm font-semibold text-foreground">
                질문 / 입력
              </h3>
              <QuestionBox question={detail.question} />
              <AnswerField
                value={answer}
                onChange={setAnswer}
                placeholder="필요한 내용을 자유롭게 입력해주세요..."
              />
            </section>

            <Separator />

            <UserMemoField value={memo} onChange={setMemo} />
          </>
        )}
      </div>

      {/* 푸터(고정) */}
      {canStructuredEdit ? (
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
            onClick={handleConfirm}
          >
            {resolving ? '재처리 중…' : '확인하기'}
          </Button>
        </PanelActions>
      ) : (
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
            onClick={handleConfirm}
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
      )}
    </>
  );
};
