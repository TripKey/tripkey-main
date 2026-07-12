import {
  Calendar,
  Check,
  MapPin,
  UserRound,
  Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type StepStatus = 'done' | 'current' | 'upcoming';

export type StepId = 'onboarding' | 'dump' | 'organize' | 'arrange' | 'confirm';

export type Step = {
  id: StepId;
  label: string;
  path?: string;
};

const STEPS: Step[] = [
  { id: 'onboarding', label: '온보딩', path: '/onboarding' },
  { id: 'dump', label: '덤프', path: '/dump' },
  { id: 'organize', label: '정리', path: '/grouping' },
  { id: 'arrange', label: '배치', path: '/arrange' },
  { id: 'confirm', label: '확정', path: '/confirm' },
];

export type HeaderProps = {
  currentStepId?: StepId;
  destination?: string;
  extraDestinations?: number;
  travelers?: number;
  dateRange?: string;
  actions?: ReactNode;
  showTripMeta?: boolean;
  /** true면 헤더 내용을 전체폭으로(워크스페이스형: 배치·확정). 기본은 가운데 정렬(문서형). */
  fluid?: boolean;
  /** false면 단계 진행바를 숨긴다(공유 링크 읽기 전용 뷰 등). 기본 노출. */
  showStepper?: boolean;
};

const Header = ({
  currentStepId = 'onboarding',
  destination = '교토',
  extraDestinations = 2,
  travelers = 2,
  dateRange = '5월 10일 ~ 5월 14일',
  actions,
  showTripMeta = true,
  fluid = false,
  showStepper = true,
}: HeaderProps) => {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStepId);
  const widthClass = fluid ? 'w-full' : 'mx-auto w-full max-w-6xl';

  // 로고 클릭 = 세션 초기화 후 메인으로. (확정 화면 '여행 세션 초기화'와 동일 방식)
  const handleLogoReset = () => {
    if (
      !window.confirm(
        '지금까지 계획한 여행이 모두 초기화돼요. 처음부터 다시 시작할까요?'
      )
    ) {
      return;
    }
    sessionStorage.clear();
    sessionStorage.setItem('tripkey:show-splash', '1'); // 리셋 후에만 스플래시 노출
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div
        className={cn(
          'flex h-16 items-center justify-between px-6',
          widthClass
        )}
      >
        <button
          type="button"
          onClick={handleLogoReset}
          className="flex items-center gap-2"
          aria-label="TripKey 홈 — 세션 초기화"
        >
          <span className="text-xl font-bold tracking-tight">TripKey</span>
        </button>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-label="프로필 (준비 중)"
              className="cursor-default rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <UserRound className="size-4.5" aria-hidden="true" />
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent>프로필 기능은 준비 중이에요</TooltipContent>
        </Tooltip>
      </div>

      <div className="border-t border-border">
        <div
          className={cn(
            'relative flex h-16 items-center justify-between gap-6 px-6',
            widthClass
          )}
        >
          {showTripMeta ? (
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">
                  {destination}
                </span>
                {extraDestinations > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-0.5 px-1.5 py-0 text-[11px]"
                  >
                    +{extraDestinations}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">
                  {travelers}인
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <span className="font-medium text-foreground">{dateRange}</span>
              </div>
            </div>
          ) : (
            <div />
          )}

          {actions ? (
            <div className="flex items-center gap-2">{actions}</div>
          ) : (
            <div />
          )}
          {showStepper && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <Stepper currentIndex={currentIndex} />
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;

const Stepper = ({ currentIndex }: { currentIndex: number }) => {
  const renderStepLabel = (step: Step) =>
    step.path && import.meta.env.MODE === 'development' ? (
      <Link to={step.path}>{step.label}</Link>
    ) : (
      step.label
    );

  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((step, index) => {
        const isLast = index === STEPS.length - 1;
        const status: StepStatus =
          index < currentIndex
            ? 'done'
            : index === currentIndex
              ? 'current'
              : 'upcoming';
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span className="flex items-center gap-1.5">
              {/* 도형 크기는 상태와 무관하게 고정(size-6), 색/채움만 변경 */}
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  status === 'done' && 'bg-muted-foreground text-background',
                  status === 'current' &&
                    'bg-primary text-primary-foreground ring-2 ring-primary/25 ring-offset-1 ring-offset-background',
                  status === 'upcoming' &&
                    'border border-border bg-background text-muted-foreground'
                )}
              >
                {status === 'done' ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                aria-current={status === 'current' ? 'step' : undefined}
                className={cn(
                  'font-medium',
                  status === 'upcoming'
                    ? 'text-muted-foreground'
                    : 'text-foreground'
                )}
              >
                {renderStepLabel(step)}
              </span>
            </span>
            {!isLast && (
              <span aria-hidden="true" className="h-px w-6 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
};
