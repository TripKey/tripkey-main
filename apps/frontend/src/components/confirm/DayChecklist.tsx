// DayChecklist — 확정 화면(SCR-05) 우측 사이드의 "Day 체크리스트".
// 선택된 Day 한정 To-do / 연결 카드 재확인 항목.

import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import type { ConfirmDayChecklistItem } from '@/dev-fixtures/confirm-mock';
import { cn } from '@/lib/utils';

type DayChecklistProps = {
  items: ConfirmDayChecklistItem[];
};

const buildInitialChecked = (items: ConfirmDayChecklistItem[]) =>
  Object.fromEntries(items.map((item) => [item.id, item.done]));

const DayChecklist = ({ items }: DayChecklistProps) => {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    buildInitialChecked(items)
  );

  // Day 탭이 바뀌면 items 가 바뀌므로 새 Day 기준으로 초기화.
  useEffect(() => {
    setChecked(buildInitialChecked(items));
  }, [items]);

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Day 체크리스트</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            편집
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            {items.length}개
          </span>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          체크리스트가 없어요.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {items.map((item) => {
            const isChecked = checked[item.id] ?? false;
            return (
              <li key={item.id}>
                <label className="flex w-full cursor-pointer items-start gap-3 rounded-lg bg-muted/40 px-3 py-2">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggle(item.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <p
                      className={cn(
                        'text-sm',
                        isChecked
                          ? 'text-muted-foreground line-through'
                          : 'text-foreground'
                      )}
                    >
                      {item.label}
                    </p>
                    {item.hint && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.hint}
                      </p>
                    )}
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default DayChecklist;
