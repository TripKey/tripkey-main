// ArrangeCardDetailPanel — 배치 화면(SCR-04) 좌측 카드 클릭 시 우측에서 열리는 상세 패널.
// 정리 화면(SCR-03)의 CardDetailPanel 과 동일한 조립 부품
// (SidePanel / StatusInfoBox / DetailRow / UserMemoField / PanelActions / PlaceCardBadge)을 재사용한다.
//
// 처리필요(unavailable) 카드 중 자연어 재파싱으로 해결 가능한 카드(detail.canResolveByNotes)는
// "장소 정보 보완"(notes) 입력 + "확인하기"(저장+재처리) 푸터를 보여준다. 그 외 카드는 기존 메모 UI.

import { Clock, Info, MapPin, Plane, User, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import PanelActions from '@/components/common/PanelActions';
import SidePanel from '@/components/common/SidePanel';
import {
  DetailRow,
  StatusInfoBox,
  UserMemoField,
} from '@/components/grouping/CardDetailParts';
import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ArrangeCardViewModel } from '@/types/arrange';

type ArrangeCardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: ArrangeCardViewModel | null;
  onSaveMemo?: (memo: string) => void;
  /** 처리필요 카드의 notes 보완 입력 → 저장+재처리(self-heal) 트리거 */
  onResolveByNotes?: (notes: string) => void;
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
  resolving,
  resolveError,
}: {
  card: ArrangeCardViewModel;
  onClose: () => void;
  onSaveMemo?: (memo: string) => void;
  onResolveByNotes?: (notes: string) => void;
  resolving: boolean;
  resolveError: string | null;
}) => {
  const detail = card.detail!;
  // 고정 카드(항공권 등)는 상단 상태 pill 을 파란색(info), 일반 카드는 초록색(done)으로.
  const isFixed = card.draggable === false;
  // 처리필요 카드(클릭 시 안내가 있는 카드)인지 / 그중 notes 재파싱으로 해결 가능한지.
  const isAttention = card.actionGuide != null;
  const isResolvable = detail.canResolveByNotes === true;

  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();

  const [notes, setNotes] = useState(detail.notes ?? '');
  const canConfirm = notes.trim().length > 0 && !resolving;

  const categoryBadge = card.badges?.find((badge) => badge.kind === 'category');

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

        {/* 처리필요 카드 안내(인플레이스). 해결 가능/불가 모두 사유를 보여준다. */}
        {isAttention && card.actionGuide && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
            <p className="flex gap-2 text-sm leading-relaxed whitespace-pre-line text-amber-800 dark:text-amber-200">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{card.actionGuide}</span>
            </p>
          </div>
        )}

        {isResolvable && (
          <>
            <ResolveByNotesField
              value={notes}
              onChange={setNotes}
              disabled={resolving}
              error={resolveError}
            />
            <Separator />
          </>
        )}
        <UserMemoField value={memo} onChange={setMemo} />
      </div>

      {/* 푸터 */}
      <PanelActions>
        <Button
          type="button"
          variant="outline"
          className="h-11 flex-1 text-sm"
          onClick={onClose}
        >
          닫기
        </Button>
        {isResolvable && (
          <Button
            type="button"
            className="h-11 flex-1 text-sm font-semibold"
            disabled={!canConfirm}
            onClick={() => onResolveByNotes?.(notes.trim())}
          >
            {resolving ? '재처리 중…' : '확인하기'}
          </Button>
        )}
        <Button
          type="button"
          variant={isResolvable ? 'outline' : 'default'}
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
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error: string | null;
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
    {error && (
      <p className="mt-2 text-xs leading-relaxed text-destructive">{error}</p>
    )}
  </section>
);
