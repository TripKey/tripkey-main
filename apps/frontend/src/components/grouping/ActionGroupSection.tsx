//접기/펼치기 가능한 "해야 할 액션" 섹션

// variant 4종(types/grouping.ts 의 ActionGroupVariant):
//   - select :보라/파랑 물음표 아이콘 — "선택이 필요한 카드들"
//   - edit :  빨강 x 아이콘 — "수정이 필요한 카드들"  (파싱 실패 / 오타 등)
//   - review     초록 체크 아이콘 — "확인만 하면 되는 카드들"
//   - unassigned 회색 제한 아이콘    — "제외된 카드들"

import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Inbox,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { cn } from '@/lib/utils';
import type { ActionGroupVariant } from '@/types/grouping';

type VariantConfig = {
  /** 헤더 원형 안에 들어갈 아이콘 */
  icon: LucideIcon;
  /** 헤더 원형의 배경색/글자색(= 아이콘 색) 클래스 */
  iconWrapClass: string;
};

const VARIANT_CONFIG: Record<ActionGroupVariant, VariantConfig> = {
  select: {
    icon: HelpCircle,
    iconWrapClass:
      'bg-blue-50 text-blue-500 dark:bg-blue-950/40 dark:text-blue-400',
  },
  edit: {
    icon: XCircle,
    iconWrapClass:
      'bg-red-50 text-red-500 dark:bg-red-950/40 dark:text-red-400',
  },
  review: {
    icon: CheckCircle,
    iconWrapClass:
      'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
  },
  unassigned: {
    icon: Inbox,
    iconWrapClass: 'bg-muted text-muted-foreground',
  },
};

type ActionGroupSectionProps = {
  variant: ActionGroupVariant;
  /** 헤더 제목("선택이 필요한 카드들" 등) */
  title: string;
  /** 헤더 보조 텍스트("1개의 카드가 선택이 필요해요" 등) */
  countLabel: string;
  /** 처음에 펼친 상태로 둘지. 기본 true. 시안은 'select' 만 false(접힘 상태 데모) */
  defaultOpen?: boolean;
  /** 펼쳤을 때 보여줄 내용(= PlaceCard 들) */
  children?: ReactNode;
};

const ActionGroupSection = ({
  variant,
  title,
  countLabel,
  defaultOpen = true,
  children,
}: ActionGroupSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  const { icon: Icon, iconWrapClass } = VARIANT_CONFIG[variant];
  // 펼침/접힘에 따라 chevron 방향만 바꾼다(회전 애니메이션은 1차 범위 밖).
  const Chevron = open ? ChevronUp : ChevronDown;
  // children 이 없으면(빈 섹션) 펼쳐도 본문 영역을 아예 안 그림.
  const hasContent = Boolean(children);

  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {/* 헤더 전체가 토글 버튼. aria-expanded 로 펼침 상태를 보조기기에 알림 */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/40"
      >
        {/* 원형 배경 + 상태 아이콘 */}
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            iconWrapClass
          )}
        >
          <Icon className="size-5" aria-hidden="true" />
        </span>

        {/* 제목 + 카운트. min-w-0 로 길면 줄어들게 */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{countLabel}</p>
        </div>

        <Chevron
          className="size-5 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
      </button>

      {/* 본문: 펼쳐졌고 + 내용이 있을 때만. 헤더와 구분선(border-t)으로 분리,
          카드들은 세로 스택(gap-2.5) */}
      {open && hasContent && (
        <div className="flex flex-col gap-2.5 border-t border-border px-4 pt-3 pb-4">
          {children}
        </div>
      )}
    </section>
  );
};

export default ActionGroupSection;
