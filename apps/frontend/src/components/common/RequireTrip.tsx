import type { ReactNode } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';

import { useOnboardingStore } from '../../utils/onboarding-store';

const RequireTrip = ({ children }: { children: ReactNode }) => {
  const storeTripId = useOnboardingStore((s) => s.tripId);
  const [searchParams] = useSearchParams();

  if (import.meta.env.MODE === 'development') {
    return <>{children}</>;
  }
  const hasTrip = Boolean(storeTripId ?? searchParams.get('tripId'));

  return hasTrip ? <>{children}</> : <Navigate to="/onboarding" replace />;
};

export default RequireTrip;
