// CardGroupSection — 배치 화면 좌측 "카드 목록"의 그룹 한 덩어리.
// 제목 + 우상단 카운트 배지 + 설명 한 줄 + 카드 스택. (정리 화면의 상태 아이콘/접기 기능은 없음)

import type { ReactNode } from 'react';

import { Badge } from '@/components/ui/badge';

type CardGroupSectionProps = {
  title: string;
  count: number;
  description?: string;
  children: ReactNode;
};

const CardGroupSection = ({
  title,
  count,
  description,
  children,
}: CardGroupSectionProps) => {
  return (
    <section className="rounded-xl bg-card p-3.5 ring-1 ring-foreground/10">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <Badge variant="secondary" className="shrink-0 text-[11px]">
          {count}개
        </Badge>
      </div>

      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">{children}</div>
    </section>
  );
};

export default CardGroupSection;
