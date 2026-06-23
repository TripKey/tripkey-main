// CardDetailPanel — "확인만 하면 되는 카드들" / "제외된 항목" 상세보기 사이드 패널 (ui 항목 동일)

import { Clock, Info, MapPin, User, X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState } from 'react';

import PanelActions from '@/components/common/PanelActions';
import SidePanel from '@/components/common/SidePanel';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { PlaceCardViewModel } from '@/types/grouping';

import {
  DetailRow,
  ItineraryInclusionBox,
  StatusInfoBox,
  UserMemoField,
} from './CardDetailParts';
import PlaceCardBadge from './PlaceCardBadge';

type CardDetailPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  card: PlaceCardViewModel | null;
  onExclude?: () => void;
  onInclude?: () => void;
  onSaveMemo?: (memo: string) => void;
};

const CardDetailPanel = ({
  open,
  onOpenChange,
  card,
  onExclude,
  onInclude,
  onSaveMemo,
}: CardDetailPanelProps) => {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      {card?.detail ? (
        // key={card.id}: 다른 카드로 다시 열렸을 때 메모 입력 state 가 초기화되도록.
        <CardDetailBody
          key={card.id}
          card={card}
          onClose={() => onOpenChange(false)}
          onExclude={onExclude}
          onInclude={onInclude}
          onSaveMemo={onSaveMemo}
        />
      ) : null}
    </SidePanel>
  );
};

export default CardDetailPanel;

// 패널 본문(헤더 + 스크롤 영역,푸터)
const CardDetailBody = ({
  card,
  onClose,
  onExclude,
  onInclude,
  onSaveMemo,
}: {
  card: PlaceCardViewModel;
  onClose: () => void;
  onExclude?: () => void;
  onInclude?: () => void;
  onSaveMemo?: (memo: string) => void;
}) => {
  const detail = card.detail!;

  const included = detail.includedInItinerary;
  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();

  const categoryBadge = card.badges?.find((badge) => badge.kind === 'category');
  const hint = detail.aiHint ?? card.reminder;

  return (
    <>
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <PlaceCardBadge
              kind="status"
              label={detail.classification}
              tone="done"
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
          {card.name} 카드의 상태·상세 정보와 사용자 메모
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

        {/* 상세 정보: 위치 / 예상 소요 시간 / 원하셨던 내용 / 알아두면 좋아요 */}
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

        {/*사용자 메모*/}
        <UserMemoField value={memo} onChange={setMemo} />

        {/* 일정 포함/제외 박스(회색)*/}
        <Separator />
        <ItineraryInclusionBox
          included={included}
          onExclude={onExclude}
          onInclude={onInclude}
        />
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
        {included && (
          <Button
            type="button"
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
