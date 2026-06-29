// ArrangeCardDetailPanel — 배치 화면(SCR-04) 좌측 카드 클릭 시 우측에서 열리는 상세 패널.
// 정리 화면(SCR-03)의 CardDetailPanel 과 동일한 조립 부품
// (SidePanel / StatusInfoBox / DetailRow / UserMemoField / PanelActions / PlaceCardBadge)을 재사용한다.
//
// 처리필요(unavailable) 카드 중:
//  - 숙소/교통 카드(canResolveByStructuredEdit): 구조화 편집 폼 + 선택처리 버튼
//  - 자연어 재파싱 가능 카드(canResolveByNotes): 장소 정보 보완 입력
//  - 그 외: 사용자 메모 UI
//
// 확인하기 PATCH 라우팅:
//  ① structuredDirty → 구조화 PATCH (location 변경 시 폴링, 아닐 시 즉시 반영)
//  ② notes 입력만  → notes PATCH (항상 폴링)
//  선택처리 버튼   → notes PATCH(기존 텍스트 자동 전송) (항상 폴링)

import { Clock, Info, MapPin, Plane, User, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import PanelActions from '@/components/common/PanelActions';
import SidePanel from '@/components/common/SidePanel';
import {
  DetailRow,
  StatusInfoBox,
  StructuredEditSection,
  UserMemoField,
} from '@/components/grouping/CardDetailParts';
import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ArrangeCardViewModel } from '@/types/arrange';
import type { CardPatchRequest } from '@/types/grouping-api';

type ArrangeCardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ArrangeCardViewModel | null;
  onSaveMemo?: (memo: string) => void;
  /** 처리필요 카드의 notes 보완 입력 → 저장+재처리(self-heal) 트리거 */
  onResolveByNotes?: (notes: string) => void;
  /** 처리필요 숙소/교통 카드의 구조화 필드 편집 → 저장(+위치 변경 시 재처리) */
  onResolveByStructuredEdit?: (args: {
    payload: CardPatchRequest;
    locationChanged: boolean;
  }) => void;
  /** 기존 location/name 을 notes 로 자동 전송해 AI 재처리 트리거 */
  onSelectProcess?: () => void;
  /** 재처리 요청~폴링이 진행 중이면 true (확인하기 버튼 로딩/잠금) */
  resolving?: boolean;
  /** 재처리가 실패했거나 시간 내에 끝나지 않은 경우의 안내(재시도 가능) */
  resolveError?: string | null;
};

const ArrangeCardDetailPanel = ({
  open,
  onOpenChange,
  card,
  onSaveMemo,
  onResolveByNotes,
  onResolveByStructuredEdit,
  onSelectProcess,
  resolving = false,
  resolveError = null,
}: ArrangeCardDetailPanelProps) => {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      {card?.detail ? (
        // key={card.id}: 다른 카드로 다시 열렸을 때 입력 state 가 초기화되도록.
        <ArrangeCardDetailBody
          key={card.id}
          card={card}
          onClose={() => onOpenChange(false)}
          onSaveMemo={onSaveMemo}
          onResolveByNotes={onResolveByNotes}
          onResolveByStructuredEdit={onResolveByStructuredEdit}
          onSelectProcess={onSelectProcess}
          resolving={resolving}
          resolveError={resolveError}
        />
      ) : null}
    </SidePanel>
  );
};

export default ArrangeCardDetailPanel;

// 패널 본문(헤더 + 스크롤 영역 + 푸터)
const ArrangeCardDetailBody = ({
  card,
  onClose,
  onSaveMemo,
  onResolveByNotes,
  onResolveByStructuredEdit,
  onSelectProcess,
  resolving,
  resolveError,
}: {
  card: ArrangeCardViewModel;
  onClose: () => void;
  onSaveMemo?: (memo: string) => void;
  onResolveByNotes?: (notes: string) => void;
  onResolveByStructuredEdit?: (args: {
    payload: CardPatchRequest;
    locationChanged: boolean;
  }) => void;
  onSelectProcess?: () => void;
  resolving: boolean;
  resolveError: string | null;
}) => {
  const detail = card.detail!;
  const isFixed = card.draggable === false;
  const isAttention = card.actionGuide != null;
  const isResolvable = detail.canResolveByNotes === true;
  const canStructuredEdit = detail.canResolveByStructuredEdit === true;
  const showConfirmButton = isResolvable || canStructuredEdit;

  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();

  const [notes, setNotes] = useState(detail.notes ?? '');

  // 구조화 편집 필드 상태 — 숙소/교통 처리필요 카드에서만 의미 있음
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
    (structuredDirty || (isResolvable && notes.trim().length > 0)) &&
    !resolving;

  const categoryBadge = card.badges?.find((badge) => badge.kind === 'category');

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
    } else if (notes.trim().length > 0) {
      onResolveByNotes?.(notes.trim());
    }
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
        <Dialog.Title className="mt-3 text-xl font-bold text-foreground">
          {card.name}
        </Dialog.Title>
        <Dialog.Description className="sr-only">
          {card.name} 카드의 배치 상태·상세 정보와 사용자 메모
        </Dialog.Description>
      </div>

      <Separator />

      {/* 본문(스크롤 영역) */}
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {/* 상태 정보 박스(회색): 분류 / 배치 상태 2칼럼 */}
        <StatusInfoBox
          classification={detail.classification}
          placementStatus={detail.placementStatus}
        />

        {/* 상세 정보: 고정 시작 시간 / 위치 / 예상 소요 시간 / 원하셨던 내용 / 알아두면 좋아요 */}
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
            {detail.durationLabel && (
              <DetailRow
                icon={Clock}
                label="예상 소요 시간"
                value={detail.durationLabel}
              />
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
        </section>

        <Separator />

        {/* 처리필요 카드 안내(인플레이스) */}
        {isAttention && card.actionGuide && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="flex gap-2 text-sm leading-relaxed whitespace-pre-line text-amber-800 dark:text-amber-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{card.actionGuide}</span>
            </p>
          </div>
        )}

        {/* 구조화 편집 섹션 (숙소/교통 처리필요 카드) */}
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
              disabled={resolving}
              canSelectProcess={detail.canSelectProcess}
              onSelectProcess={onSelectProcess}
            />
            <Separator />
          </>
        )}

        {/* 장소 정보 보완 섹션 (notes 재파싱 가능 카드) */}
        {isResolvable && (
          <ResolveByNotesField
            value={notes}
            onChange={setNotes}
            disabled={resolving}
            conflictWarning={structuredDirty && notes.trim().length > 0}
          />
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

        {/* 사용자 메모 — resolvable/구조화 편집 카드에서도 항상 노출(#267) */}
        {isResolvable && <Separator />}
        <UserMemoField value={memo} onChange={setMemo} />
      </div>

      {/* 푸터 — 메모 저장은 항상 노출, 확인하기는 해결 가능 카드에만 추가(#267) */}
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
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {resolving ? '재처리 중…' : '확인하기'}
          </Button>
        )}
        <Button
          type="button"
          variant={showConfirmButton ? 'outline' : 'default'}
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

// 처리필요 카드의 "장소 정보 보완"(notes) 입력 필드.
const ResolveByNotesField = ({
  value,
  onChange,
  disabled,
  conflictWarning,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  conflictWarning?: boolean;
}) => (
  <section>
    <h3 className="text-sm font-semibold text-foreground">장소 정보 보완</h3>
    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
      장소명이나 주소를 더 정확히 입력하면 AI 가 다시 분석해 지도 위치를
      찾아드려요.
    </p>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder="예) 도톤보리 글리코 사인 앞 / 오사카시 추오구 도톤보리 1-10-2"
      rows={3}
      className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none disabled:opacity-60"
    />
    {conflictWarning && (
      <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
        구조화 편집 중에는 장소 정보 보완을 함께 전송하지 않아요. 먼저
        확인하기를 눌러 저장하세요.
      </p>
    )}
  </section>
);
