// 화면 조회용 GET API가 없어 mock 으로 렌더한다.

import { useState } from 'react';

import AlertCardList from '@/components/confirm/AlertCardList';
import ContextCardList from '@/components/confirm/ContextCardList';
import DayChecklist from '@/components/confirm/DayChecklist';
import DaySummary from '@/components/confirm/DaySummary';
import DayTabs from '@/components/confirm/DayTabs';
import SaveShareCard from '@/components/confirm/SaveShareCard';
import TripChecklist from '@/components/confirm/TripChecklist';
import TripHeroCard from '@/components/confirm/TripHeroCard';
import Header from '@/components/header/Header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { CONFIRM_FIXTURE } from '@/dev-fixtures/confirm-mock';

const ConfirmPage = () => {
  const { summary, hero, tripChecklist, alertCards, days } = CONFIRM_FIXTURE;

  const [activeIndex, setActiveIndex] = useState(0);
  const activeDay = days[activeIndex];

  // 여행 세션 초기화: 새 탭을 연 것과 동일하게 sessionStorage를 비우고
  // 전체 새로고침으로 모든 스토어를 초기 상태에서 다시 띄운다.
  const handleResetSession = () => {
    if (
      !window.confirm(
        '현재 여행 세션을 초기화할까요? 입력한 내용이 모두 삭제됩니다.'
      )
    ) {
      return;
    }

    sessionStorage.clear();
    window.location.href = '/onboarding';
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      <Header
        currentStepId="confirm"
        destination={summary.destination}
        extraDestinations={summary.extraDestinations}
        travelers={summary.travelers}
        dateRange={summary.dateRange}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              배치로 돌아가기
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetSession}>
              여행 세션 초기화
            </Button>
          </div>
        }
      />

      <main className="grid flex-1 grid-cols-[300px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-6 border-r border-border bg-card px-8 py-10">
          <div>
            <p className="text-xs font-semibold tracking-widest text-primary">
              FINAL REVIEW
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              확정 전 최종 점검
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              03과 04에서 수집된 카드 맥락, To-do, alert를 한 번에 점검하는
              화면이에요.
            </p>
          </div>

          <Separator />

          <TripChecklist items={tripChecklist} />

          <Separator />

          <AlertCardList items={alertCards} />
        </aside>

        <section className="flex flex-col gap-8 px-8 py-10">
          <TripHeroCard {...hero} />

          <DayTabs
            days={days}
            activeIndex={activeIndex}
            onSelect={setActiveIndex}
          />

          {activeDay && (
            <>
              <DaySummary
                title={activeDay.title}
                summary={activeDay.summary}
                totalMove={activeDay.totalMove}
                totalSpend={activeDay.totalSpend}
              />

              <div className="grid grid-cols-[minmax(0,1fr)_320px] items-start gap-6">
                <ContextCardList cards={activeDay.contextCards} />
                <div className="flex flex-col gap-6">
                  <DayChecklist items={activeDay.dayChecklist} />
                  <SaveShareCard />
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default ConfirmPage;
