// PlaceCard — 정리 화면(SCR-03)의 장소 카드 한 장

import { ChevronRight, Clock, MapPin } from 'lucide-react';

import Callout from '@/components/common/Callout';
import Spinner from '@/components/common/Spinner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PlaceCardAccent, PlaceCardViewModel } from '@/types/grouping';

import PlaceCardBadge from './PlaceCardBadge';

const ACCENT_BAR: Record<PlaceCardAccent, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
  red: 'bg-destructive',
  muted: 'bg-muted-foreground/30',
};

type PlaceCardProps = PlaceCardViewModel & {
  /** 카드 행 클릭(상세 열기 등).*/
  onClick?: () => void;
  /** 보조 액션 버튼 클릭("수정하기" 등). */
  onAction?: () => void;
};

const PlaceCard = ({
  name,
  region,
  durationLabel,
  accent = 'green',
  badges = [],
  reminder,
  processing = false,
  loading = false,
  actionLabel,
  onClick,
  onAction,
}: PlaceCardProps) => {
  if (loading) {
    return <PlaceCardSkeleton accent={accent} />;
  }

  const hasMeta = Boolean(region || durationLabel);
  const isRowButton = !processing && !actionLabel && Boolean(onClick);

  const rowContent = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{name}</p>
        {hasMeta && (
          <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            {region && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {region}
              </span>
            )}
            {durationLabel && (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {durationLabel}
              </span>
            )}
          </p>
        )}
      </div>

      {badges.length > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          {badges.map((badge, index) => (
            <PlaceCardBadge key={index} {...badge} />
          ))}
        </div>
      )}

      {/* 제외 카드의 보조 액션 버튼("수정하기" 등) */}
      {actionLabel && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}

      <ChevronRight
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </>
  );

  return (
    <div className="relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div
        className={cn(
          'flex',
          processing && 'pointer-events-none select-none opacity-40'
        )}
      >
        {/* 좌측 컬러 액센트 바 */}
        <span
          aria-hidden="true"
          className={cn('w-1 shrink-0', ACCENT_BAR[accent])}
        />

        {/* 본문 컬럼: (클릭 가능한)행 + (옵션)리마인더 배너 */}
        <div className="min-w-0 flex-1">
          {isRowButton ? (
            <button
              type="button"
              onClick={onClick}
              className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40"
            >
              {rowContent}
            </button>
          ) : (
            <div className="flex items-start gap-3 px-4 py-3">{rowContent}</div>
          )}

          {reminder && (
            <div className="px-4 pb-3">
              <Callout tone="warning">{reminder}</Callout>
            </div>
          )}
        </div>
      </div>

      {/* processing 오버레이(스피너) */}
      {processing && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/30">
          <Spinner />
        </div>
      )}
    </div>
  );
};

export default PlaceCard;

const PlaceCardSkeleton = ({ accent }: { accent: PlaceCardAccent }) => {
  return (
    <div className="flex overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <span
        aria-hidden="true"
        className={cn('w-1 shrink-0', ACCENT_BAR[accent])}
      />
      <div className="flex-1 space-y-2 px-4 py-3.5" aria-hidden="true">
        <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
};
