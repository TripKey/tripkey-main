// Callout — 정보/경고/에러 톤을 가진 안내 박스. title 을 주면 아이콘 원형+제목/본문 상세형, 없으면 한 줄 컴팩트형.

import { AlertCircle, Info, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type CalloutTone = 'info' | 'warning' | 'error';

type ToneStyle = {
  icon: LucideIcon;
  /** 컴팩트형(한 줄) 컨테이너 */
  compactBox: string;
  /** 상세형 컨테이너 */
  detailBox: string;
  /** 상세형 아이콘 원형 */
  iconBadge: string;
  /** 상세형 제목 */
  title: string;
  /** 상세형 본문 */
  body: string;
  /** 상세형 보조 줄 */
  footer: string;
};

const TONE_STYLE: Record<CalloutTone, ToneStyle> = {
  info: {
    icon: Info,
    compactBox:
      'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200',
    detailBox: 'bg-blue-50 dark:bg-blue-950/30',
    iconBadge: 'bg-blue-500 text-white dark:bg-blue-600',
    title: 'text-blue-700 dark:text-blue-300',
    body: 'text-blue-700/80 dark:text-blue-300/75',
    footer: 'text-blue-700/65 dark:text-blue-300/55',
  },
  warning: {
    icon: Info,
    compactBox:
      'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
    detailBox: 'bg-amber-50 dark:bg-amber-950/30',
    iconBadge: 'bg-amber-500 text-white dark:bg-amber-600',
    title: 'text-amber-800 dark:text-amber-300',
    body: 'text-amber-800/80 dark:text-amber-300/75',
    footer: 'text-amber-800/65 dark:text-amber-300/55',
  },
  error: {
    icon: AlertCircle,
    compactBox: 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200',
    detailBox: 'bg-red-50 dark:bg-red-950/30',
    iconBadge: 'bg-red-500 text-white dark:bg-red-600',
    title: 'text-red-700 dark:text-red-300',
    body: 'text-red-700/80 dark:text-red-300/75',
    footer: 'text-red-700/65 dark:text-red-300/55',
  },
};

type CalloutProps = {
  tone?: CalloutTone;
  /** 있으면 상세형(아이콘 원형 + 제목 + 본문) 레이아웃으로 렌더 */
  title?: string;
  /** 상세형이면 제목 아래 본문, 컴팩트형이면 한 줄 메시지 */
  children: ReactNode;
  /** 상세형 하단 보조 줄(예: "사유: ...") */
  footer?: ReactNode;
  className?: string;
};

const Callout = ({
  tone = 'info',
  title,
  children,
  footer,
  className,
}: CalloutProps) => {
  const style = TONE_STYLE[tone];
  const Icon = style.icon;

  if (!title) {
    return (
      <div
        className={cn(
          'flex items-start gap-2 rounded-lg px-3 py-2 text-xs leading-relaxed',
          style.compactBox,
          className
        )}
      >
        <Icon className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        <span>{children}</span>
      </div>
    );
  }

  return (
    <div
      className={cn('flex gap-3 rounded-xl p-4', style.detailBox, className)}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          style.iconBadge
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={cn('text-sm font-semibold', style.title)}>{title}</p>
        <p className={cn('text-sm leading-relaxed', style.body)}>{children}</p>
        {footer && (
          <p className={cn('pt-0.5 text-xs', style.footer)}>{footer}</p>
        )}
      </div>
    </div>
  );
};

export default Callout;
