import { useEffect, useRef, useState } from 'react';

type SplashScreenProps = {
  onFinish: () => void;
  holdMs?: number;
  fadeMs?: number;
};

const SplashScreen = ({
  onFinish,
  holdMs = 1100,
  fadeMs = 600,
}: SplashScreenProps) => {
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    const enterId = requestAnimationFrame(() => setEntered(true));
    const leaveId = setTimeout(() => setLeaving(true), holdMs);
    const finishId = setTimeout(() => onFinishRef.current(), holdMs + fadeMs);
    return () => {
      cancelAnimationFrame(enterId);
      clearTimeout(leaveId);
      clearTimeout(finishId);
    };
  }, [holdMs, fadeMs]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity ease-out"
      style={{
        opacity: leaving ? 0 : 1,
        transitionDuration: `${fadeMs}ms`,
      }}
    >
      <div
        className="flex items-center gap-3 transition-all duration-700 ease-out"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? 'translateY(0)' : 'translateY(8px)',
        }}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground">
          T
        </span>
        <span className="text-3xl font-bold tracking-tight">TripKey</span>
      </div>
    </div>
  );
};

export default SplashScreen;
