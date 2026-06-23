// Spinner — 라벨이 달린 로딩 스피너.

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type SpinnerProps = {
  label?: string;
  className?: string;
};

const Spinner = ({ label = '처리 중...', className }: SpinnerProps) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 text-xs font-medium text-muted-foreground',
        className
      )}
    >
      <Loader2
        className="size-5 animate-spin text-primary"
        aria-hidden="true"
      />
      {label && <span>{label}</span>}
    </div>
  );
};

export default Spinner;
