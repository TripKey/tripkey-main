// CardDetailParts — 카드 상세 사이드 패널들 공통 ui들

import { type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MEMO_HINT =
  '메모는 04 추천 흐름에 조용히 반영되고, 처리 후에는 AI 맥락 내용만 업데이트돼요.';

//상세 정보
export const DetailRow = ({
  icon: Icon,
  label,
  value,
  emphasis = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  emphasis?: boolean;
}) => (
  <li className="flex gap-3">
    <Icon
      className={cn(
        'mt-0.5 size-4 shrink-0',
        emphasis ? 'text-amber-500' : 'text-muted-foreground'
      )}
      aria-hidden="true"
    />
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          'text-xs',
          emphasis
            ? 'text-amber-700/80 dark:text-amber-300/70'
            : 'text-muted-foreground'
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'mt-0.5 text-sm leading-relaxed',
          emphasis
            ? 'font-medium text-amber-800 dark:text-amber-200'
            : 'text-foreground'
        )}
      >
        {value}
      </p>
    </div>
  </li>
);

//회색 상태 정보 박스
export const StatusInfoBox = ({
  classification,
  placementStatus,
}: {
  classification: string;
  placementStatus: string;
}) => (
  <section className="rounded-xl bg-muted/60 p-4">
    <h3 className="text-sm font-semibold text-foreground">상태 정보</h3>
    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">분류</dt>
        <dd className="mt-0.5 text-sm font-semibold text-foreground">
          {classification}
        </dd>
      </div>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">배치 상태</dt>
        <dd className="mt-0.5 text-sm font-semibold text-foreground">
          {placementStatus}
        </dd>
      </div>
    </dl>
  </section>
);

//사용자 메모
export const UserMemoField = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => (
  <section>
    <h3 className="text-sm font-semibold text-foreground">사용자 메모</h3>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="자유롭게 메모를 남겨주세요..."
      rows={3}
      className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
    />
    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
      {MEMO_HINT}
    </p>
  </section>
);

//하단 회색 박스 (일정 포함/제외 상태 안내 + 토글 버튼)

export const ItineraryInclusionBox = ({
  included = true,
  onExclude,
  onInclude,
}: {
  included?: boolean;
  //제외하기 (included=true 일 때만 보임)
  onExclude?: () => void;
  //포함하기(included=false 일 때만 보임)
  onInclude?: () => void;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/60 p-4">
    <div className="min-w-0">
      <p className="text-sm font-semibold text-foreground">
        {included ? '일정에 포함된 항목이에요' : '현재 제외된 항목이에요'}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {included
          ? '제외하기를 누르면 일정 후보에서 빠집니다.'
          : '포함하기를 누르면 다시 일정 후보로 돌아와요.'}
      </p>
    </div>
    {included ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={onExclude}
      >
        제외하기
      </Button>
    ) : (
      <Button type="button" size="sm" className="shrink-0" onClick={onInclude}>
        포함하기
      </Button>
    )}
  </div>
);

// 질문 박스
export const QuestionBox = ({ question }: { question: string }) => (
  <div className="mt-3 rounded-xl bg-indigo-50/70 px-4 py-3.5 dark:bg-indigo-950/30">
    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
      질문
    </p>
    <p className="mt-1.5 text-sm leading-relaxed font-medium text-indigo-900 dark:text-indigo-100">
      {question}
    </p>
  </div>
);

//질문에 대한 답변
export const AnswerField = ({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) => (
  <div className="mt-4">
    <h4 className="text-sm font-semibold text-foreground">질문에 대한 답변</h4>
    <textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      rows={3}
      className="mt-3 w-full resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none"
    />
  </div>
);
