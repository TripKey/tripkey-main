import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  FEATURED_DESTINATIONS,
  TRAVEL_TIPS,
} from '@/dev-fixtures/travel-content';

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* 히어로 */}
      <section className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          여행 계획, 더 쉽게
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          가고 싶은 곳만 던져두면 동선까지 정리해주는 여행 플래너
        </p>
        <Button
          size="lg"
          className="mt-8"
          onClick={() => navigate('/onboarding')}
        >
          여행 계획 세우기
        </Button>
      </section>

      {/* 추천 여행지 */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-bold tracking-tight">추천 여행지</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_DESTINATIONS.map((dest) => (
            <div
              key={dest.id}
              className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {dest.country}
              </p>
              <p className="mt-1 text-lg font-semibold">{dest.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {dest.tagline}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 여행 팁 */}
      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-2xl font-bold tracking-tight">여행 팁</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TRAVEL_TIPS.map((tip) => (
            <div
              key={tip.id}
              className="rounded-xl border border-border bg-card p-5"
            >
              <p className="font-semibold">{tip.title}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {tip.description}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default MainPage;
