// TripSummaryCard — 우측 sticky 사이드바의 "여행 요약" 카드
import {
  Calendar,
  CreditCard,
  MapPin,
  User,
  ClipboardCheck,
  type LucideIcon,
} from 'lucide-react';
import { type ReactNode } from 'react';

import ProgressStat from '@/components/common/ProgressStat';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { TripSummaryViewModel } from '@/types/grouping';

import SummaryStatBadge from './SummaryStatBadge';

type TripSummaryCardProps = TripSummaryViewModel & {
  onNext?: () => void;
  onPrev?: () => void;
  nextDisabled?: boolean;
};

const TripSummaryCard = ({
  destinations,
  dateRange,
  nights,
  days,
  travelers,
  totalCards,
  reservation,
  cardStats,
  completionPct,
  onNext,
  onPrev,
  nextDisabled,
}: TripSummaryCardProps) => {
  return (
    <div className="rounded-2xl bg-card p-6 shadow-sm ring-1 ring-foreground/10">
      <h2 className="text-lg font-bold text-foreground">여행 요약</h2>

      <ul className="mt-5 space-y-4">
        <SummaryRow icon={MapPin} label="여행지">
          <span className="font-semibold text-foreground">
            {destinations.join(', ')}
          </span>
        </SummaryRow>

        <SummaryRow icon={Calendar} label="일정">
          <span className="font-semibold text-foreground">{dateRange}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {nights}박 {days}일
          </span>
        </SummaryRow>

        <SummaryRow icon={User} label="동행자">
          <span className="font-semibold text-foreground">{travelers}명</span>
        </SummaryRow>

        {reservation && (
          <SummaryRow icon={ClipboardCheck} label="예약 완료">
            <span className="font-semibold text-foreground">{reservation}</span>
          </SummaryRow>
        )}

        {totalCards != null && (
          <SummaryRow icon={CreditCard} label="전체 카드">
            <span className="font-semibold text-foreground">
              {totalCards}개
            </span>
            <span className="mt-1.5 flex flex-wrap gap-1">
              {cardStats?.map((stat) => (
                <SummaryStatBadge
                  key={stat.label}
                  label={stat.label}
                  count={stat.count}
                  tone={stat.tone}
                />
              ))}
            </span>
          </SummaryRow>
        )}
      </ul>

      <Separator className="my-5" />

      {/* 정리 완료도 */}
      {completionPct != null && (
        <ProgressStat
          label="정리 완료도"
          value={completionPct}
          valueSuffix="완료"
        />
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        <Button
          onClick={onNext}
          disabled={nextDisabled}
          className="h-11 w-full text-sm font-semibold"
        >
          다음 단계로
        </Button>
        {onPrev && (
          <Button
            variant="outline"
            onClick={onPrev}
            className="h-11 w-full text-sm"
          >
            이전 단계
          </Button>
        )}
      </div>
    </div>
  );
};

export default TripSummaryCard;

// "여행 요약" 항목 한 줄
const SummaryRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) => {
  return (
    <li className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5">{children}</div>
      </div>
    </li>
  );
};
