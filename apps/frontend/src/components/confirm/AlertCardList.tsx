// AlertCardList — 확정 화면(SCR-05) 좌측 사이드 "Alert Cards".
// kind 별 색 구분: 실무 알림 / 출발 준비(amber) · AI 인사이트(blue).

import { cn } from '@/lib/utils';
import type { ConfirmAlertCard } from '@/types/confirm';

type AlertCardListProps = {
  items: ConfirmAlertCard[];
};

// 색은 라벨(kind)이 아니라 분류축(category)으로 결정 — 컨트랙트 alert_cards.category 정렬.
const CATEGORY_STYLE: Record<
  ConfirmAlertCard['category'],
  { card: string; chip: string }
> = {
  practical: {
    card: 'bg-amber-50/70 dark:bg-amber-950/20',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  },
  insight: {
    card: 'bg-blue-50/60 dark:bg-blue-950/20',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  },
};

const AlertCardList = ({ items }: AlertCardListProps) => {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Alert Cards</h2>
        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600 tabular-nums dark:bg-blue-950/40 dark:text-blue-300">
          {items.length}개
        </span>
      </header>

      {items.length === 0 ? (
        <p className="rounded-xl bg-card py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          알림이 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const style = CATEGORY_STYLE[item.category];
            return (
              <li key={item.id}>
                <article className={cn('rounded-xl p-4', style.card)}>
                  <span
                    className={cn(
                      'inline-flex rounded-md px-2.5 py-1 text-xs font-semibold',
                      style.chip
                    )}
                  >
                    {item.kind}
                  </span>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                    {item.body}
                  </p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AlertCardList;
