import { Calendar, MapPin, Minus, Plus, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import ProgressStat from '../components/common/ProgressStat';
import Header from '../components/header/Header';
import TripCalendar from '../components/onboarding/calendar/TripCalendar';
import DestinationInput from '../components/onboarding/DestinationInput';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';
import {
  useCalendarStore,
  formatDateRangeLabel,
} from '../utils/calendar-store';
import { useOnboardingStore } from '../utils/onboarding-store';

const Label = ({ children }: { children: React.ReactNode }) => (
  <span className="mb-2 block text-sm font-medium text-foreground">
    {children}
  </span>
);

const SummaryRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) => (
  <li className="flex gap-3">
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
      <Icon className="size-4" aria-hidden="true" />
    </span>
    <div className="min-w-0 flex-1 text-sm">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  </li>
);

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { submitOnboarding, resetForm } = useOnboardingStore((s) => s.actions);
  const errorMessage = useOnboardingStore((s) => s.errorMessage);

  const { tripName, destinations, companion_count } = useOnboardingStore(
    (s) => s.form
  );
  const setForm = useOnboardingStore((s) => s.actions.setForm);

  const { type, exactDate, flexDate } = useCalendarStore();
  const resetCalendar = useCalendarStore((s) => s.resetCalendar);
  const dateRange = formatDateRangeLabel(type, exactDate, flexDate);
  const nights = exactDate?.nights ?? flexDate?.nights ?? 0;
  const travelers = companion_count === 0 ? 1 : companion_count;

  const hasDestination = destinations.length > 0;
  const hasSchedule = type !== null;
  const filledCount = [hasDestination, hasSchedule].filter(Boolean).length;
  const completionPct = (filledCount / 2) * 100;
  const remainingFields = 2 - filledCount;
  const progressValueLabel =
    remainingFields > 0 ? `${remainingFields}개 남음` : '준비 완료';
  const isNextDisabled = filledCount < 2;

  // 스플래시에서 이어지듯 떠오른다.
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);

  const handleNext = async () => {
    const success = await submitOnboarding();
    if (success) navigate('/dump');
  };

  const changeTravelers = (delta: number) =>
    setForm({ companion_count: Math.max(1, travelers + delta) });

  const handleReset = () => {
    resetForm();
    resetCalendar();
  };

  return (
    <>
      <Header
        currentStepId="onboarding"
        showTripMeta={false}
        actions={
          <Button variant="outline" size="sm" onClick={handleReset}>
            초기화
          </Button>
        }
      />
      <div className="flex min-h-[calc(100vh-8rem)] items-start justify-center bg-linear-to-b from-muted/50 to-background px-4 pt-10 pb-16 sm:pt-14">
        <div
          className={cn(
            'w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-xl transition-opacity duration-800 ease-out',
            shown ? 'opacity-100' : 'opacity-0'
          )}
        >
          <div className="grid lg:grid-cols-[1fr_340px]">
            {/* 좌측: 입력 */}
            <div className="p-8 sm:p-10">
              <header>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  어디로 떠나볼까요?
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  간단히 알려주면 여행 준비를 시작할게요
                </p>
              </header>

              <div className="mt-8 flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      여행 이름{' '}
                      <span className="font-normal text-muted-foreground">
                        (선택)
                      </span>
                    </Label>
                    <input
                      value={tripName}
                      onChange={(e) => setForm({ tripName: e.target.value })}
                      placeholder="예: 오사카 여행"
                      className="h-10.5 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                    />
                  </div>

                  <div>
                    <Label>인원</Label>
                    <div className="flex h-10.5 items-center justify-between rounded-xl border border-border px-3">
                      <button
                        type="button"
                        aria-label="인원 감소"
                        onClick={() => changeTravelers(-1)}
                        disabled={travelers <= 1}
                        className="flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted disabled:opacity-40"
                      >
                        <Minus className="size-4" />
                      </button>
                      <span className="text-sm font-semibold text-foreground">
                        {travelers}명
                      </span>
                      <button
                        type="button"
                        aria-label="인원 증가"
                        onClick={() => changeTravelers(1)}
                        className="flex size-8 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>여행지</Label>
                  <DestinationInput placeholder="도시명을 검색하세요" />
                </div>

                <div>
                  <Label>일정</Label>
                  <TripCalendar />
                </div>
              </div>
            </div>

            {/* 우측: 요약 (같은 박스 안에 통합) */}
            <aside className="flex flex-col border-t border-border bg-muted/20 p-8 lg:border-l lg:border-t-0">
              <h2 className="text-lg font-bold text-foreground">여행 요약</h2>

              <ul className="mt-5 space-y-4">
                <SummaryRow icon={MapPin} label="여행지">
                  <span className="font-semibold text-foreground">
                    {destinations.length ? destinations.join(', ') : '-'}
                  </span>
                </SummaryRow>
                <SummaryRow icon={Calendar} label="일정">
                  <span className="font-semibold text-foreground">
                    {dateRange}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {nights}박 {nights + 1}일
                  </span>
                </SummaryRow>
                <SummaryRow icon={User} label="여행 인원">
                  <span className="font-semibold text-foreground">
                    {travelers}명
                  </span>
                </SummaryRow>
              </ul>

              <Separator className="my-5" />

              <ProgressStat
                label="입력 완료도"
                value={completionPct}
                valueLabel={progressValueLabel}
              />

              <Button
                onClick={handleNext}
                disabled={isNextDisabled}
                className="mt-5 h-11 w-full text-sm font-semibold"
              >
                다음 단계로
              </Button>
              {isNextDisabled && (
                <p className="mt-3 text-xs text-muted-foreground">
                  여행지와 일정을 입력하면 다음 단계로 진행할 수 있어요.
                </p>
              )}
              {errorMessage && (
                <p className="mt-3 text-xs text-destructive">{errorMessage}</p>
              )}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingPage;
