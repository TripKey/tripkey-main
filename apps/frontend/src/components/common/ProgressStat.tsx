// ProgressStat — 라벨 + 퍼센트 + 진행 막대(+선택 캡션)를 한 묶음으로 보여주는 작은 통계 블록.

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type ProgressStatProps = {
  label: string;
  /** 0~100 */
  value: number;
  /** 퍼센트 뒤에 붙는 텍스트(예: "완료"). 기본은 "%" 만 표시 */
  valueSuffix?: string;
  /** 막대 아래 보조 설명 */
  caption?: string;
  /** 카드 박스(rounded/bg/ring/padding)로 감쌀지. 기본 false(상위 카드 안에 끼워 쓰는 용도) */
  boxed?: boolean;
  className?: string;
};

const ProgressStat = ({
  label,
  value,
  valueSuffix,
  caption,
  boxed = false,
  className,
}: ProgressStatProps) => {
  const content = (
    <>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-sm',
            boxed ? 'font-medium text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
        <span className="text-sm font-bold text-primary tabular-nums">
          {value}%{valueSuffix ? ` ${valueSuffix}` : ''}
        </span>
      </div>

      <Progress value={value} className="mt-2.5 h-2" />

      {caption && (
        <p className="mt-2.5 text-xs text-muted-foreground">{caption}</p>
      )}
    </>
  );

  if (!boxed) {
    return <div className={className}>{content}</div>;
  }

  return (
    <div
      className={cn(
        'rounded-xl bg-card px-5 py-4 ring-1 ring-foreground/10',
        className
      )}
    >
      {content}
    </div>
  );
};

export default ProgressStat;
