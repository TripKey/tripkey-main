// TripHeroCard — 확정 화면(SCR-05) 중앙 상단 히어로 카드.
// 여행 제목/메타 + 4-stat 그리드(여행 리듬/이동 성향/숙소 전략/남은 변수).

import type { ConfirmStat } from '@/dev-fixtures/confirm-mock';

type TripHeroCardProps = {
  title: string;
  destinations: string[];
  travelers: number;
  durationLabel: string;
  stats: ConfirmStat[];
};

const TripHeroCard = ({
  title,
  destinations,
  travelers,
  durationLabel,
  stats,
}: TripHeroCardProps) => {
  const meta = [destinations.join(', '), `${travelers}명`, durationLabel]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="rounded-2xl bg-primary px-8 py-7 text-primary-foreground">
      <p className="text-xs font-semibold tracking-widest opacity-80">
        FINAL REVIEW
      </p>
      <h2 className="mt-2 text-2xl font-bold">{title}</h2>
      <p className="mt-1 text-sm opacity-80">{meta}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-primary-foreground/10 px-4 py-3"
          >
            <p className="text-xs opacity-75">{stat.label}</p>
            <p className="mt-1 text-sm font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TripHeroCard;
