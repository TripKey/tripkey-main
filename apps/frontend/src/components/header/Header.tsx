import { Calendar, Check, MapPin, Plus, Users } from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type StepStatus = 'done' | 'current' | 'upcoming';

type Step = {
  id: string;
  label: string;
  status: StepStatus;
};

const STEPS: Step[] = [
  { id: 'onboarding', label: '온보딩', status: 'done' },
  { id: 'dump', label: '덤프', status: 'done' },
  { id: 'organize', label: '정리', status: 'current' },
  { id: 'arrange', label: '배치', status: 'upcoming' },
  { id: 'confirm', label: '확정', status: 'upcoming' },
];

type HeaderProps = {
  destination?: string;
  extraDestinations?: number;
  travelers?: number;
  dateRange?: string;
  userInitials?: string;
  onAddCard?: () => void;
  onAlertDemo?: () => void;
  onAlertMergedDemo?: () => void;
};

const Header = ({
  destination = '교토',
  extraDestinations = 2,
  travelers = 2,
  dateRange = '5월 10일 ~ 5월 14일',
  userInitials = 'KY',
  onAddCard,
  onAlertDemo,
  onAlertMergedDemo,
}: HeaderProps) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background">
      <div className="flex h-16 items-center justify-between px-6">
        <a href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-base font-bold text-primary-foreground">
            T
          </span>
          <span className="text-xl font-bold tracking-tight">TripKey</span>
        </a>
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex h-16 items-center justify-between gap-6 border-t border-border px-6">
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

        <Stepper steps={STEPS} />

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAlertDemo}>
            Alert Demo
          </Button>
          <Button variant="outline" size="sm" onClick={onAlertMergedDemo}>
            Alert 합친 Demo
          </Button>
          <Button size="sm" onClick={onAddCard}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            카드 추가하기
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;

const Stepper = ({ steps }: { steps: Step[] }) => {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.id} className="flex items-center gap-2">
            {step.status === 'current' ? (
              <span
                aria-current="step"
                className="rounded-full bg-primary px-3.5 py-1 font-medium text-primary-foreground"
              >
                {step.label}
              </span>
            ) : step.status === 'done' ? (
              <span className="flex items-center gap-1 font-medium text-primary">
                <Check className="h-4 w-4" aria-hidden="true" />
                {step.label}
              </span>
            ) : (
              <span className="text-muted-foreground">{step.label}</span>
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
