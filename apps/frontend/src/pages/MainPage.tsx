import {
  Activity,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lightbulb,
  Luggage,
  type LucideIcon,
  MapPin,
  Plane,
  Route,
  Utensils,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  FEATURED_DESTINATIONS,
  TRAVEL_TIPS,
} from '@/dev-fixtures/travel-content';
import { useReveal } from '@/hooks/useReveal';
import { cn } from '@/lib/utils';

const TIP_ICONS: Record<string, LucideIcon> = {
  'tip-flight': Plane,
  'tip-pack': Luggage,
  'tip-route': Route,
};

// 미리보기 섹션 왼쪽에 세로로 나열하는 서비스 강점 3가지
const STRENGTHS = [
  {
    dot: 'bg-indigo-500',
    title: '자유롭게 기록하세요',
    desc: '여행은 완벽한 계획보다 떠오르는 생각에서 시작됩니다.\n\n가고 싶은 장소, 저장해 둔 링크, 친구가 추천한 맛집까지 형식 없이 적어보세요. AI가 내용을 이해해 여행 카드로 정리하고, 흩어진 아이디어를 하나의 여행으로 연결합니다.',
  },
  {
    dot: 'bg-violet-500',
    title: 'AI가 대신 정리합니다',
    desc: '메모만 많아지고 정리는 늘 뒤로 미뤄지곤 합니다.\n\nTripKey는 비슷한 장소를 자동으로 묶고, 부족한 정보는 보완하여 보기 쉬운 여행 카드로 정리합니다. 여러 곳에 흩어진 정보도 한눈에 확인할 수 있습니다.',
  },
  {
    dot: 'bg-fuchsia-500',
    title: '이동까지 고려합니다',
    desc: '좋은 여행은 이동보다 경험이 더 많아야 합니다.\n\nAI가 장소 간 거리와 이동 시간을 고려해 날짜별 일정을 자동으로 구성하고, 불필요한 이동을 줄인 효율적인 동선을 제안합니다.',
  },
];

// 1번 강점 목업 — 흩어진 메모 칩
const DUMP_NOTES = [
  {
    text: '오사카 3박 4일',
    color: 'bg-amber-100 text-amber-900',
    rotate: '-rotate-3',
  },
  {
    text: '쿠로몬 시장',
    color: 'bg-pink-100 text-pink-900',
    rotate: 'rotate-2',
  },
  { text: '느긋하게', color: 'bg-sky-100 text-sky-900', rotate: '-rotate-1' },
  {
    text: '감성 카페 위주',
    color: 'bg-violet-100 text-violet-900',
    rotate: 'rotate-3',
  },
  {
    text: '오사카성 꼭!',
    color: 'bg-lime-100 text-lime-900',
    rotate: '-rotate-2',
  },
  {
    text: '밤엔 이자카야',
    color: 'bg-amber-100 text-amber-900',
    rotate: 'rotate-1',
  },
];

// 제품 미리보기 목업 — 실제 PlaceCard 디자인을 그대로 반영
const CARD_ACCENT = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  amber: 'bg-amber-500',
} as const;

const CARD_CATEGORY = {
  food: { icon: Utensils, label: '맛집' },
  place: { icon: MapPin, label: '장소' },
  activity: { icon: Activity, label: '활동' },
} as const;

const PREVIEW_CARDS: {
  name: string;
  region: string;
  duration: string;
  category: keyof typeof CARD_CATEGORY;
  accent: keyof typeof CARD_ACCENT;
}[] = [
  {
    name: '쿠로몬 시장',
    region: '닛폰바시',
    duration: '1시간',
    category: 'food',
    accent: 'green',
  },
  {
    name: '오사카성 공원',
    region: '오사카성',
    duration: '1시간 30분',
    category: 'place',
    accent: 'blue',
  },
  {
    name: '나카노시마 강변 산책로',
    region: '나카노시마',
    duration: '40분',
    category: 'activity',
    accent: 'amber',
  },
  {
    name: '우라난바 이자카야',
    region: '우라난바',
    duration: '1시간 30분',
    category: 'food',
    accent: 'green',
  },
];

const reveal = (shown: boolean) =>
  cn(
    'transition-all duration-500 ease-out',
    shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
  );

// CTA를 누르면 App 레벨 스플래시를 띄운 채 온보딩으로 진입한다.
type MainPageProps = {
  onStartPlanning: () => void;
};

const MainPage = ({ onStartPlanning: startPlanning }: MainPageProps) => {
  // 히어로를 지나 아래로 스크롤하면 헤더 CTA를 보여준다.
  const [showHeaderCta, setShowHeaderCta] = useState(false);
  useEffect(() => {
    const onScroll = () =>
      setShowHeaderCta(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // 랜딩은 항상 맨 위에서 시작한다 (새로고침 시 브라우저 스크롤 복원 방지).
  useEffect(() => {
    const prev = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    return () => {
      history.scrollRestoration = prev;
    };
  }, []);

  // 히어로는 첫 로드에 한 번 페이드인한다.
  const [heroIn, setHeroIn] = useState(false);
  useEffect(() => setHeroIn(true), []);

  // 스크롤로 들어올 때 등장시킬 섹션들.
  const preview = useReveal<HTMLElement>();
  const features = useReveal<HTMLElement>();
  const tips = useReveal<HTMLDivElement>();

  // 기능 카루셀 자동 슬라이드 (hover/터치 시 멈춤, 끝나면 처음으로, 모션 민감 사용자는 제외).
  const carouselRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let paused = false;
    const pause = () => (paused = true);
    const resume = () => (paused = false);
    el.addEventListener('mouseenter', pause);
    el.addEventListener('mouseleave', resume);
    el.addEventListener('touchstart', pause, { passive: true });

    const STEP = 308; // 카드(w-72=288) + gap-5(20)
    const id = setInterval(() => {
      if (paused) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      el.scrollTo({
        left: atEnd ? 0 : el.scrollLeft + STEP,
        behavior: 'smooth',
      });
    }, 3000);

    return () => {
      clearInterval(id);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('mouseleave', resume);
      el.removeEventListener('touchstart', pause);
    };
  }, []);

  const scrollCarousel = (direction: 1 | -1) => {
    carouselRef.current?.scrollBy({
      left: direction * 308,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative isolate min-h-screen bg-background">
      {/* 헤더+히어로 뒤로 깔리는 몽환 오로라 배경 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[105vh] overflow-hidden mask-[linear-gradient(to_bottom,#000_78%,transparent)]"
      >
        {/* 그리드 텍스처 (아주 옅게) */}
        <div className="absolute inset-0 hero-grid" />
        {/* 몽환적 오라 — 보라를 중심으로 파랑·핑크·청록이 번짐, 크고 느리게 숨쉼 */}
        <div className="absolute -top-40 left-1/2 size-184 -translate-x-1/2 rounded-full bg-violet-500/25 blur-3xl animate-[aura-breathe_26s_ease-in-out_infinite] motion-reduce:animate-none dark:bg-violet-500/22" />
        <div className="absolute top-[6%] left-[2%] size-80 rounded-full bg-indigo-400/40 blur-3xl animate-[aura-breathe_30s_ease-in-out_infinite] [animation-delay:-8s] motion-reduce:animate-none dark:bg-indigo-500/22" />
        <div className="absolute top-[22%] right-[-4%] size-96 rounded-full bg-fuchsia-400/35 blur-3xl animate-[aura-breathe_34s_ease-in-out_infinite] [animation-delay:-16s] motion-reduce:animate-none dark:bg-fuchsia-500/20" />
        <div className="absolute bottom-[2%] left-[14%] size-80 rounded-full bg-sky-400/30 blur-3xl animate-[aura-breathe_28s_ease-in-out_infinite] [animation-delay:-4s] motion-reduce:animate-none dark:bg-sky-500/18" />
        <div className="absolute right-[16%] bottom-[16%] size-72 rounded-full bg-pink-400/28 blur-3xl animate-[aura-breathe_32s_ease-in-out_infinite] [animation-delay:-20s] motion-reduce:animate-none dark:bg-pink-500/16" />
        {/* 밝은 코어 — 은은한 빛무리 */}
        <div className="absolute top-[16%] left-1/2 size-40 -translate-x-1/2 rounded-full bg-fuchsia-200/45 blur-3xl animate-[aura-breathe_18s_ease-in-out_infinite] [animation-delay:-9s] motion-reduce:animate-none dark:bg-fuchsia-300/20" />
      </div>
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">TripKey</span>
          </Link>
          <Button
            size="sm"
            onClick={startPlanning}
            className={cn(
              'cursor-pointer transition-all duration-300 hover:bg-primary/90 active:scale-95',
              showHeaderCta ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
          >
            여행 계획 세우기
          </Button>
        </div>
      </header>

      {/* 히어로 (배경 오로라는 상위 레이어에서 헤더 뒤까지 깔림) */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6 text-center">
        <div
          className={cn(
            'relative z-10 flex flex-col items-center',
            reveal(heroIn)
          )}
        >
          <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
            <MapPin className="size-3.5" aria-hidden="true" />
            TripKey · AI 여행 플래너
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-7xl">
            여행 계획, 더 쉽게
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            가고 싶은 곳만 던져두면, TripKey가 동선까지 정리해줘요
          </p>
          <div className="relative mt-8">
            <Button
              size="lg"
              className="peer relative z-10 h-14 cursor-pointer rounded-full px-10 text-base font-semibold transition-transform hover:bg-primary/90 hover:scale-[1.03] active:scale-95"
              onClick={startPlanning}
            >
              여행 계획 세우기
            </Button>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-0 m-auto size-40 animate-pulse rounded-full bg-primary/30 blur-2xl transition-transform duration-500 ease-out peer-hover:scale-125 motion-reduce:animate-none"
            />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground"
        >
          <ChevronDown className="size-8" />
        </div>
      </section>

      {/* 던지면 이렇게 정리돼요 — 왼쪽 강점 3가지 + 오른쪽 실제 카드 */}
      <section
        ref={preview.ref}
        className={cn('mx-auto max-w-6xl px-6 py-20', reveal(preview.shown))}
      >
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight sm:text-4xl">
            던지면,{' '}
            <span className="mx1 font-extrabold text-primary">알아서</span>{' '}
            정리되는 여행
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
            형식 없이 기록하기만 하면,
            <br />
            TripKey가 정리부터 동선까지 대신 완성해드립니다.
          </p>
        </div>

        <div className="mt-16 space-y-16 lg:space-y-36">
          {/* 1. 자유롭게 던지기 — 흩어진 메모 칩 */}
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full bg-indigo-500"
              />
              <h3 className="mt-3 text-2xl font-bold tracking-tight">
                자유롭게 기록하세요
              </h3>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                {STRENGTHS[0].desc}
              </p>
            </div>
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-400/30 via-sky-400/15 to-transparent blur-2xl"
              />
              <div className="rounded-3xl border border-border bg-background p-6 shadow-xl">
                <div className="flex flex-wrap gap-2.5">
                  {DUMP_NOTES.map((note) => (
                    <span
                      key={note.text}
                      className={cn(
                        'rounded-md px-3 py-2 text-sm font-medium shadow-sm',
                        note.color,
                        note.rotate
                      )}
                    >
                      {note.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. 똑똑한 정리 — 정리된 카드 (좌우 반전) */}
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div className="lg:order-2">
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full bg-violet-500"
              />
              <h3 className="mt-3 text-2xl font-bold tracking-tight">
                AI가 대신 정리합니다
              </h3>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                {STRENGTHS[1].desc}
              </p>
            </div>
            <div className="relative lg:order-1">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-violet-400/30 via-fuchsia-400/15 to-transparent blur-2xl"
              />
              <div className="rounded-3xl border border-border bg-background p-5 shadow-xl">
                <div className="mb-4 flex items-center justify-between px-1">
                  <p className="text-sm font-bold">오사카 · 1일차</p>
                  <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                    AI 정리 완료
                  </span>
                </div>
                <div className="space-y-2.5">
                  {PREVIEW_CARDS.slice(0, 3).map((card) => {
                    const category = CARD_CATEGORY[card.category];
                    const CategoryIcon = category.icon;
                    return (
                      <div
                        key={card.name}
                        className="flex overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            'w-1 shrink-0',
                            CARD_ACCENT[card.accent]
                          )}
                        />
                        <div className="flex flex-1 items-start gap-3 px-4 py-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {card.name}
                            </p>
                            <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <MapPin
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                {card.region}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock
                                  className="size-3.5"
                                  aria-hidden="true"
                                />
                                {card.duration}
                              </span>
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 pt-0.5 text-xs font-medium text-muted-foreground">
                            <CategoryIcon
                              className="size-3.5"
                              aria-hidden="true"
                            />
                            {category.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3. 동선 자동 배치 — 날짜별 경로 */}
          <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
            <div>
              <span
                aria-hidden="true"
                className="inline-block size-2.5 rounded-full bg-fuchsia-500"
              />
              <h3 className="mt-3 text-2xl font-bold tracking-tight">
                이동까지 고려합니다
              </h3>
              <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
                {STRENGTHS[2].desc}
              </p>
            </div>
            <div className="relative">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-fuchsia-400/30 via-pink-400/15 to-transparent blur-2xl"
              />
              <div className="flex items-center justify-center rounded-3xl border border-border bg-background p-10 shadow-xl">
                <div className="flex items-center">
                  {['1일', '2일', '3일'].map((day, i) => (
                    <div key={day} className="flex items-center">
                      <div
                        className={cn(
                          'flex size-12 items-center justify-center rounded-full text-sm font-bold text-white',
                          ['bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500'][
                            i
                          ]
                        )}
                      >
                        {day}
                      </div>
                      {i < 2 && (
                        <span
                          aria-hidden="true"
                          className="mx-2 w-10 border-t-2 border-dashed border-border"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <Button
            size="lg"
            onClick={startPlanning}
            className="h-12 cursor-pointer rounded-full px-8 font-semibold transition-transform hover:bg-primary/90 hover:scale-[1.03] active:scale-95"
          >
            내 일정 만들어보기
          </Button>
        </div>
      </section>

      <section
        ref={features.ref}
        className={cn('mx-auto max-w-6xl px-6 py-16', reveal(features.shown))}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-3xl font-bold tracking-tight">추천 여행지</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/70 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                서비스 중
              </span>
            </div>
            <p className="mt-3 text-base text-muted-foreground">
              지금 만나볼 수 있는 여행지예요. 옆으로 넘겨 둘러보세요.
            </p>
          </div>

          <div className="hidden shrink-0 gap-2 sm:flex">
            <button
              type="button"
              aria-label="이전"
              onClick={() => scrollCarousel(-1)}
              className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              aria-label="다음"
              onClick={() => scrollCarousel(1)}
              className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
        <div
          ref={carouselRef}
          className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scrollbar-none"
        >
          {FEATURED_DESTINATIONS.map((dest) => (
            <div
              key={dest.id}
              className="group relative h-96 w-80 shrink-0 snap-center overflow-hidden rounded-3xl"
            >
              <img
                src={dest.image}
                alt={dest.name}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{dest.name}</h3>
                  <p className="mt-2 text-sm text-white/85">{dest.tagline}</p>
                </div>

                <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  {dest.country}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-center gap-2 sm:hidden">
          <button
            type="button"
            aria-label="이전"
            onClick={() => scrollCarousel(-1)}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
          >
            <ChevronLeft className="size-5" />
          </button>

          <button
            type="button"
            aria-label="다음"
            onClick={() => scrollCarousel(1)}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </section>

      {/* 여행 팁 */}
      <section className="bg-muted/30 py-16">
        <div
          ref={tips.ref}
          className={cn('mx-auto max-w-6xl px-6', reveal(tips.shown))}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-3xl">
            여행 팁
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            떠나기 전 알아두면 좋은 것들
          </p>
          <div className="mx-auto mt-8 max-w-5xl grid grid-cols-1 gap-4 sm:grid-cols-3">
            {TRAVEL_TIPS.map((tip) => {
              const Icon = TIP_ICONS[tip.id] ?? Lightbulb;
              return (
                <div
                  key={tip.id}
                  className="rounded-2xl border border-border bg-background p-6 transition-shadow hover:shadow-md"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <p className="mt-4 font-semibold">{tip.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {tip.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground md:flex-row">
          <div>
            <p className="font-semibold text-foreground">TripKey</p>
            <p className="text-xs">당신의 여행을 가장 쉽게 계획하는 방법</p>
          </div>

          <div className="flex items-center gap-6">
            <a className="transition-colors hover:text-foreground">이용약관</a>
            <a className="transition-colors hover:text-foreground">
              개인정보처리방침
            </a>
            <a className="transition-colors hover:text-foreground">문의하기</a>
          </div>

          <p className="text-xs">© 2026 TripKey. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default MainPage;
