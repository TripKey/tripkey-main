// 여행 상세(GET /trips/{tripId}) React Query 훅.
// 그룹화/배치/확정 세 화면이 같은 여행 메타를 필요로 하므로 공유한다.

import { useQuery } from '@tanstack/react-query';

import { fetchTripDetail } from '../utils/trip-api';

export const tripKeys = {
  detail: (tripId: string) => ['trip', tripId, 'detail'] as const,
};

export const useTripDetailQuery = (tripId: string | null) =>
  useQuery({
    queryKey: tripKeys.detail(tripId ?? ''),
    queryFn: () => fetchTripDetail(tripId as string),
    enabled: Boolean(tripId),
  });
