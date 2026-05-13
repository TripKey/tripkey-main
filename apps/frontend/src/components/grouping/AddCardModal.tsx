// AddCardModal — 헤더 "카드 추가하기" 버튼으로 여는 중앙 모달.
// 한 번 입력하면 AI 가 먼저 정리한 뒤 카드 목록에 올라간다(처리 요청은 1차 stub).

import { X } from 'lucide-react';
import { Dialog } from 'radix-ui';
import { useState, type FormEvent, type ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CATEGORY_OPTIONS = [
  { value: 'place', label: '장소' },
  { value: 'activity', label: '활동' },
  { value: 'flight', label: '항공권' },
  { value: 'lodging', label: '숙소' },
  { value: 'food', label: '맛집' },
  { value: 'etc', label: '기타' },
] as const;

export type AddCardCategory = (typeof CATEGORY_OPTIONS)[number]['value'];

export type AddCardDraft = {
  category: AddCardCategory;
  name: string;
  region: string;
  /** 체류시간(분). 비워두면 0 */
  durationMin: number;
  timeMemo: string;
  memo: string;
};

type AddCardModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** "처리 요청하기" — 1차는 stub. 닫는 동작은 onOpenChange(false) 로 호출부가 결정 */
  onSubmit?: (draft: AddCardDraft) => void;
};

// 패널들 textarea 와 동일한 입력 필드 스타일(단, 한 줄 입력은 h-11 고정).
const INPUT_CLASS =
  'h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none';

const AddCardModal = ({ open, onOpenChange, onSubmit }: AddCardModalProps) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-card shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:duration-200 data-[state=closed]:duration-150">
          {/* Dialog.Content 는 닫히면 언마운트되므로 본문 입력 state 는 열 때마다 초기화된다 */}
          <AddCardForm
            onClose={() => onOpenChange(false)}
            onSubmit={onSubmit}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AddCardModal;

// AddCardForm — 모달 본문(헤더 + 입력 폼 + 푸터). 입력 state 를 들고 있다.
const AddCardForm = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit?: (draft: AddCardDraft) => void;
}) => {
  const [category, setCategory] = useState<AddCardCategory>('place');
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [duration, setDuration] = useState('60');
  const [timeMemo, setTimeMemo] = useState('');
  const [memo, setMemo] = useState('');

  const canSubmit = name.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit?.({
      category,
      name: name.trim(),
      region: region.trim(),
      durationMin: Number(duration) || 0,
      timeMemo: timeMemo.trim(),
      memo: memo.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      {/* 헤더 */}
      <div className="shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Dialog.Title className="text-xl font-bold text-foreground">
            카드 추가하기
          </Dialog.Title>
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
        <Dialog.Description className="mt-1 text-sm text-muted-foreground">
          한 번 입력하면 AI가 먼저 정리한 뒤 카드 목록에 올려드려요.
        </Dialog.Description>
      </div>

      {/* 본문(스크롤) */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5">
        {/* 카테고리(단일 선택) */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">카테고리</p>
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORY_OPTIONS.map((option) => {
              const active = category === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(option.value)}
                  className={cn(
                    'rounded-xl border px-3 py-3 text-sm font-medium transition-colors',
                    active
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-200'
                      : 'border-input bg-background text-foreground hover:border-muted-foreground/30 hover:bg-muted/50'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 카드 이름 */}
        <Field label="카드 이름" htmlFor="add-card-name">
          <input
            id="add-card-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 교토 철학의 길"
            autoFocus
            className={INPUT_CLASS}
          />
        </Field>

        {/* 지역 / 체류시간(분) */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="지역" htmlFor="add-card-region">
            <input
              id="add-card-region"
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              placeholder="예: 교토"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="체류시간(분)" htmlFor="add-card-duration">
            <input
              id="add-card-duration"
              type="number"
              inputMode="numeric"
              min={0}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
        </div>

        {/* 시간 메모 */}
        <Field label="시간 메모" htmlFor="add-card-time-memo">
          <input
            id="add-card-time-memo"
            value={timeMemo}
            onChange={(event) => setTimeMemo(event.target.value)}
            placeholder="예: 오전 방문, 저녁 식사"
            className={INPUT_CLASS}
          />
        </Field>

        {/* 추가 메모 */}
        <Field label="추가 메모" htmlFor="add-card-memo">
          <textarea
            id="add-card-memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="가고 싶은 이유나 기억해둘 내용을 적어주세요."
            rows={4}
            className="w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
          />
        </Field>
      </div>

      {/* 푸터 */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-10 px-5"
            onClick={onClose}
          >
            닫기
          </Button>
          <Button
            type="submit"
            className="h-10 px-5 font-semibold"
            disabled={!canSubmit}
          >
            처리 요청하기
          </Button>
        </div>
      </div>
    </form>
  );
};

// Field — "라벨 + 입력 한 줄" 한 칸. label/input 을 htmlFor 로 묶어준다.
const Field = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) => (
  <div className="space-y-2">
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-foreground"
    >
      {label}
    </label>
    {children}
  </div>
);
