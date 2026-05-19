import { Calendar, Check, MapPin, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

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
  { id: 'arrange', label: '배치' },
  { id: 'confirm', label: '확정' },
];

export type HeaderProps = {
  currentStepId?: StepId;
  destination?: string;
  extraDestinations?: number;
  travelers?: number;
  dateRange?: string;
  userInitials?: string;
  actions?: ReactNode;
  showTripMeta?: boolean;
};

const Header = ({
  currentStepId = 'onboarding',
  destination = '교토',
  extraDestinations = 2,
  travelers = 2,
  dateRange = '5월 10일 ~ 5월 14일',
  userInitials = 'KY',
  actions,
  showTripMeta = true,
}: HeaderProps) => {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStepId);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            T
          </span>
          <span className="text-xl font-bold tracking-tight">TripKey</span>
        </Link>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex h-16 items-center justify-between gap-6 border-t border-border px-6">
        {showTripMeta ? (
          <div className="flex items-center gap-5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-foreground">{destination}</span>
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
              <span className="font-medium text-foreground">{travelers}인</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium text-foreground">{dateRange}</span>
            </div>
          </div>
        ) : (
          <div />
        )}

        <Stepper currentIndex={currentIndex} />

        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : (
          <div />
        )}
      </div>
    </header>
  );
};

export default Header;

const Stepper = ({ currentIndex }: { currentIndex: number }) => {
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
            {status === 'current' ? (
              <span
                aria-current="step"
                className="rounded-full bg-primary px-3.5 py-1 font-medium text-primary-foreground"
              >
                {step.path ? (
                  <Link to={step.path}>{step.label}</Link> // 개발용 링크
                ) : (
                  step.label
                )}
              </span>
            ) : status === 'done' ? (
              <span className="flex items-center gap-1 font-medium text-primary">
                <Check className="h-4 w-4" aria-hidden="true" />
                {step.path ? (
                  <Link to={step.path}>{step.label}</Link> // 개발용 링크
                ) : (
                  step.label
                )}
              </span>
            ) : (
              <span className="text-muted-foreground">
                {step.path ? (
                  <Link to={step.path}>{step.label}</Link> // 개발용 링크
                ) : (
                  step.label
                )}
              </span>
            )}
            {!isLast && (
              <span aria-hidden="true" className="h-px w-6 bg-border" />
            )}
          </li>
        );
      })}
    </ol>
  );
};
