// SCR-05 확정 화면 — 확정(POST /confirm)은 배치 화면(SCR-04)에서 끝나고,
// 이 화면은 GET /trips·/cards·/days 를 조합해 확정 결과를 점검용으로 보여준다.
// tripId 는 URL(?tripId=) → 온보딩 스토어 순으로 취득(진입 가드는 RequireTrip 위임).

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import AlertCardList from '@/components/confirm/AlertCardList';
import ContextCardList from '@/components/confirm/ContextCardList';
import DayChecklist from '@/components/confirm/DayChecklist';
import DaySummary from '@/components/confirm/DaySummary';
import DayTabs from '@/components/confirm/DayTabs';
import MapCard from '@/components/confirm/MapCard';
import SaveShareCard from '@/components/confirm/SaveShareCard';
import TripChecklist from '@/components/confirm/TripChecklist';
import TripHeroCard from '@/components/confirm/TripHeroCard';
import Header from '@/components/header/Header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useArrangeCardsQuery, useDaysQuery } from '@/hooks/useArrange';
import { useTripDetailQuery } from '@/hooks/useTripDetail';
import { formatDateRangeLabel, useCalendarStore } from '@/utils/calendar-store';
import { mapToConfirmViewModel } from '@/utils/confirm-mapper';
import { useOnboardingStore } from '@/utils/onboarding-store';

const ConfirmPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlTripId = searchParams.get('tripId');
  const storeTripId = useOnboardingStore((s) => s.tripId);
  const form = useOnboardingStore((s) => s.form);
  const tripId = urlTripId ?? storeTripId;

  // dateRange 폴백용 — 서버 start_date·출국편으로 날짜를 못 구할 때만 사용.
  const calType = useCalendarStore((s) => s.type);
  const exactDate = useCalendarStore((s) => s.exactDate);
  const flexDate = useCalendarStore((s) => s.flexDate);

  const tripDetailQuery = useTripDetailQuery(tripId);
  const cardsQuery = useArrangeCardsQuery(tripId);
  const detail = tripDetailQuery.data;

  // Day 수 = travel_days(메타 미로딩 시 온보딩 form 폴백).
  const dayCount = detail?.travel_days ?? form.travel_days;
  const daysQuery = useDaysQuery(tripId, dayCount);

  const [activeIndex, setActiveIndex] = useState(0);
  const [showMap, setShowMap] = useState(true);

  const viewModel = useMemo(() => {
    const rawFallback = formatDateRangeLabel(calType, exactDate, flexDate);
    return mapToConfirmViewModel({
      detail,
      cardsRes: cardsQuery.data,
      dayViewModels: daysQuery.dayViewModels,
      form,
      // formatDateRangeLabel 은 값이 없으면 '-' 를 반환 — 매퍼에서 '기간 미정' 으로 처리되게 빈 문자열로.
      dateRangeFallback: rawFallback === '-' ? '' : rawFallback,
    });
  }, [
    detail,
    cardsQuery.data,
    daysQuery.dayViewModels,
    form,
    calType,
    exactDate,
    flexDate,
  ]);

  const { summary, hero, tripChecklist, alertCards, days } = viewModel;

  const noTrip = !tripId;
  const isLoading =
    Boolean(tripId) &&
    (tripDetailQuery.isLoading ||
      cardsQuery.isLoading ||
      (dayCount > 0 && !daysQuery.isLoaded));
  const isError =
    tripDetailQuery.isError || cardsQuery.isError || daysQuery.isError;

  // 탭 인덱스가 days 범위를 벗어나면 클램프.
  const safeIndex = Math.min(activeIndex, Math.max(days.length - 1, 0));
  const activeDay = days[safeIndex];

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

  // 활성 Day 카드 중 좌표 있는 것만 마커로 (좌표 없는 카드는 스킵).
  const mapMarkers = useMemo(
    () =>
      (activeDay?.contextCards ?? [])
        .filter((card) => card.coordinates)
        .map((card) => ({
          id: card.id,
          order: card.order,
          name: card.name,
          lat: card.coordinates!.lat,
          lng: card.coordinates!.lng,
          category: card.category,
          region: card.region,
        })),
    [activeDay]
  );

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
            <Button
              variant="outline"
              size="sm"
              disabled={!tripId}
              onClick={() =>
                navigate(`/arrange${tripId ? `?tripId=${tripId}` : ''}`)
              }
            >
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
          {noTrip ? (
            <EmptyState
              title="여행 정보가 없어요"
              body="먼저 여행을 만들거나 URL에 ?tripId=… 를 추가해 주세요."
            />
          ) : isError ? (
            <EmptyState
              title="확정 정보를 불러오지 못했어요"
              body="잠시 후 다시 시도하거나 배치 화면에서 다시 진입해 주세요."
            />
          ) : (
            <>
              <TripHeroCard {...hero} />

              {showMap && !isLoading && <MapCard markers={mapMarkers} />}

              {isLoading ? (
                <EmptyState
                  title="불러오는 중…"
                  body="확정 정보를 정리하고 있어요."
                />
              ) : days.length === 0 ? (
                <EmptyState
                  title="배치된 Day가 없어요"
                  body="배치 화면에서 일정을 먼저 구성해 주세요."
                />
              ) : (
                <>
                  <DayTabs
                    days={days}
                    activeIndex={safeIndex}
                    onSelect={setActiveIndex}
                    mapVisible={showMap}
                    onToggleMap={() => setShowMap((v) => !v)}
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
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
};

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className="rounded-2xl bg-card p-10 text-center ring-1 ring-foreground/10">
    <p className="text-sm font-bold text-foreground">{title}</p>
    <p className="mt-1 text-xs text-muted-foreground">{body}</p>
  </div>
);

export default ConfirmPage;
