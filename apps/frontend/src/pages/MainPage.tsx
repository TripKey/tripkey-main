import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lightbulb,
  Luggage,
  type LucideIcon,
  MapPin,
  Plane,
  Route,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  FEATURED_DESTINATIONS,
  SERVICE_FEATURES,
  TRAVEL_TIPS,
} from '@/dev-fixtures/travel-content';
import { cn } from '@/lib/utils';

const TIP_ICONS: Record<string, LucideIcon> = {
  'tip-flight': Plane,
  'tip-pack': Luggage,
  'tip-route': Route,
};

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

  // 추천 여행지 섹션이 화면에 들어오면 카드를 순서대로 등장시킨다 (한 번만).
  const destRef = useRef<HTMLDivElement>(null);
  const [cardsRevealed, setCardsRevealed] = useState(false);
  useEffect(() => {
    const el = destRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCardsRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              T
            </span>
            <span className="text-lg font-bold tracking-tight">TripKey</span>
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

      {/* 히어로 */}
      <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-linear-to-b from-muted/40 to-background px-6 text-center">
        <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
          <MapPin className="size-3.5" aria-hidden="true" />
          AI 여행 플래너
        </span>
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          여행 계획, 더 쉽게
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted-foreground">
          가고 싶은 곳만 던져두면 동선까지 정리해주는 여행 플래너
        </p>
        <Button
          size="lg"
          className="mt-8 h-14 cursor-pointer rounded-full px-10 text-base font-semibold transition-transform hover:bg-primary/90 hover:scale-[1.03] active:scale-95"
          onClick={startPlanning}
        >
          여행 계획 세우기
        </Button>
        <div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground"
        >
          <ChevronDown className="size-8" />
        </div>
      </section>

      {/* 기능 소개 — 옆으로 넘기는 카루셀 */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight">
          TripKey로 할 수 있는 것
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">옆으로 넘겨보세요</p>
        <div
          ref={carouselRef}
          className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4 scrollbar-none"
        >
          {SERVICE_FEATURES.map((feature) => (
            <div
              key={feature.id}
              className={cn(
                'flex h-96 w-72 shrink-0 snap-center flex-col rounded-3xl p-7',
                feature.bg
              )}
            >
              <div className="flex-1">
                <h3 className="text-xl font-bold text-neutral-900">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-neutral-700">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
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

      {/* 추천 여행지 */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="text-2xl font-bold tracking-tight">추천 여행지</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          요즘 인기 있는 여행지를 둘러보세요
        </p>
        <div ref={destRef} className="mt-8 flex flex-col gap-5">
          {FEATURED_DESTINATIONS.slice(0, 4).map((dest, i) => (
            <div
              key={dest.id}
              style={{ transitionDelay: `${i * 100}ms` }}
              className={cn(
                'transition-all duration-500 ease-out',
                cardsRevealed
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-6 opacity-0'
              )}
            >
              <div className="group relative h-72 overflow-hidden rounded-2xl shadow-sm transition-shadow hover:shadow-xl">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/15 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6">
                  <div>
                    <p className="text-2xl font-bold text-white">{dest.name}</p>
                    <p className="mt-1 text-sm text-white/85">{dest.tagline}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                    {dest.country}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 여행 팁 */}
      <section className="bg-muted/30 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="text-2xl font-bold tracking-tight">여행 팁</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            떠나기 전 알아두면 좋은 것들
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      {/* 맨 위로 */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <Button
          variant="outline"
          size="lg"
          className="cursor-pointer transition-transform active:scale-95"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <ChevronUp className="size-5" />맨 위로
        </Button>
      </section>
    </div>
  );
};

export default MainPage;
