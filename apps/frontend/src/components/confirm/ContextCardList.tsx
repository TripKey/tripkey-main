// ContextCardList — 확정 화면(SCR-05) 본문 "카드 맥락 기반 일정".
// Day 의 카드들을 번호 + 제목/시간/위치 + 사용자 맥락 + AI 팁으로 펼쳐서 보여준다.

import PlaceCardBadge from '@/components/grouping/PlaceCardBadge';
import type { ConfirmCardViewModel } from '@/dev-fixtures/confirm-mock';

type ContextCardListProps = {
  cards: ConfirmCardViewModel[];
};

const ContextCardList = ({ cards }: ContextCardListProps) => {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">
          카드 맥락 기반 일정
        </h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {cards.length}개 카드
        </span>
      </header>

      {cards.length === 0 ? (
        <p className="rounded-2xl bg-card py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
          이 Day 에 배치된 카드가 없어요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {cards.map((card) => (
            <li key={card.id}>
              <ContextCard {...card} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

const ContextCard = ({
  order,
  name,
  badges = [],
  timeLabel,
  region,
  userNote,
  aiTip,
}: ConfirmCardViewModel) => {
  const meta = [timeLabel, region].filter(Boolean).join(' · ');

  return (
    <article className="flex gap-4 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background"
      >
        {order}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {name}
          </p>
          {badges.map((badge, index) => (
            <PlaceCardBadge key={index} {...badge} />
          ))}
        </div>
        {meta && <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>}

        {userNote && (
          <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-2 text-xs dark:bg-indigo-950/40">
            <p className="font-semibold text-indigo-700 dark:text-indigo-300">
              사용자 맥락
            </p>
            <p className="mt-0.5 text-indigo-900 dark:text-indigo-100">
              {userNote}
            </p>
          </div>
        )}

        {aiTip && (
          <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs dark:bg-amber-950/30">
            <p className="font-semibold text-amber-700 dark:text-amber-300">
              AI 팁
            </p>
            <p className="mt-0.5 text-amber-900 dark:text-amber-100">{aiTip}</p>
          </div>
        )}
      </div>
    </article>
  );
};

export default ContextCardList;
