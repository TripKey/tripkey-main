// ArrangeCardDetailPanel — 배치 화면(SCR-04) 좌측 카드 클릭 시 우측에서 열리는 상세 패널.
// 정리 화면(SCR-03)의 CardDetailPanel 과 동일한 조립 부품
// (SidePanel / StatusInfoBox / DetailRow / UserMemoField / PanelActions / PlaceCardBadge)을 재사용한다.

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
};

const ArrangeCardDetailPanel = ({
  open,
  onOpenChange,
  card,
  onSaveMemo,
}: ArrangeCardDetailPanelProps) => {
  return (
    <SidePanel open={open} onOpenChange={onOpenChange}>
      {card?.detail ? (
        // key={card.id}: 다른 카드로 다시 열렸을 때 메모 입력 state 가 초기화되도록.
        <ArrangeCardDetailBody
          key={card.id}
          card={card}
          onClose={() => onOpenChange(false)}
          onSaveMemo={onSaveMemo}
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
}: {
  card: ArrangeCardViewModel;
  onClose: () => void;
  onSaveMemo?: (memo: string) => void;
}) => {
  const detail = card.detail!;
  // 고정 카드(항공권 등)는 상단 상태 pill 을 파란색(info), 일반 카드는 초록색(done)으로.
  const isFixed = card.draggable === false;

  const initialMemo = detail.memo ?? '';
  const [memo, setMemo] = useState(initialMemo);
  const memoDirty = memo.trim() !== initialMemo.trim();

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

        {/* 사용자 메모 */}
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
        <Button
          type="button"
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
