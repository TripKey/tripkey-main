// TripChecklist — 확정 화면(SCR-05) 좌측 사이드의 "여행 전반 체크리스트".
// 출국 전까지 처리해야 할 실무 항목(여권/항공권/숙소 바우처/보험 등) 목록.

import { Pencil } from 'lucide-react';
import { useState } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import type { ConfirmChecklistItem } from '@/dev-fixtures/confirm-mock';
import { cn } from '@/lib/utils';

type TripChecklistProps = {
  items: ConfirmChecklistItem[];
};

const TripChecklist = ({ items }: TripChecklistProps) => {
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((item) => [item.id, item.done]))
  );

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">
          여행 전반 체크리스트
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          편집
        </button>
      </header>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const isChecked = checked[item.id] ?? false;
          return (
            <li key={item.id}>
              <label className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-foreground/10 transition-colors hover:bg-muted/40">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => toggle(item.id)}
                />
                <span
                  className={cn(
                    'text-sm',
                    isChecked
                      ? 'text-muted-foreground line-through'
                      : 'text-foreground'
                  )}
                >
                  {item.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default TripChecklist;
