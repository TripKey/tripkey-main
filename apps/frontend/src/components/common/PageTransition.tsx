import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * 페이지 진입 모션 공용 클래스.
 * tw-animate-css의 enter 키프레임을 마운트 시 한 번만 재생한다.
 * 키프레임 방식이라 재생이 끝나면 잔여 transform이 남지 않아
 * sticky/맵/드래그앤드롭 등 좌표 기반 레이아웃에 영향을 주지 않는다.
 * motion-safe 로 감싸 prefers-reduced-motion 사용자는 자동 제외된다.
 */

// 기본: 살짝 떠오르며 페이드인 (자체 연출이 없는 일반 화면용).
export const PAGE_ENTER =
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-4 motion-safe:duration-500 motion-safe:ease-out';

// 페이드만: 지도 등 transform 에 민감한 화면용(슬라이드 없이 opacity 만).
export const PAGE_ENTER_FADE =
  'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-500 motion-safe:ease-out';

/**
 * Fragment 루트 페이지를 감싸 화면 전체가 부드럽게 떠오르도록 한다.
 * 단일 루트 엘리먼트가 있는 페이지는 이 래퍼 대신 PAGE_ENTER(_FADE) 를 직접 붙이면 된다.
 */
const PageTransition = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => <div className={cn(PAGE_ENTER, className)}>{children}</div>;

export default PageTransition;
