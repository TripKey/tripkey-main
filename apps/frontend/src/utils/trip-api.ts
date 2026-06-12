import type { TripDetailResponse } from '../types/trip-api';

import { apiClient } from './api-client';
import { API_PATH } from './constants';

/** 여행 메타 조회 — 그룹화/배치/확정 공통(여행지·일수·인원·시작일·확정여부). */
export const fetchTripDetail = async (
  tripId: string
): Promise<TripDetailResponse> => {
  const response = await apiClient.get<TripDetailResponse>(
    API_PATH.TRIP_DETAIL(tripId)
  );
  return response.data;
};
