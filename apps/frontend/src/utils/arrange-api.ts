import type {
  DayViewModel,
  Groups04Response,
  PlacementSaveRequest,
  PlacementSaveResponse,
} from '../types/arrange-api';

import { apiClient } from './api-client';
import { API_PATH } from './constants';

/** 좌측 "카드 목록"(배치 가능 스톡 + 처리 필요 + 제외) */
export const fetchGroups04 = async (
  tripId: string
): Promise<Groups04Response> => {
  const response = await apiClient.get<Groups04Response>(
    API_PATH.GROUPS(tripId),
    { params: { view: '04' } }
  );
  return response.data;
};

/** 특정 Day에 배치된 카드(출국/귀국편 분리) */
export const fetchDay = async (
  tripId: string,
  dayNumber: number
): Promise<DayViewModel> => {
  const response = await apiClient.get<DayViewModel>(
    API_PATH.DAY(tripId, dayNumber)
  );
  return response.data;
};

/** 동선 검증 — 전체 배치 스냅샷을 보내고 경고 목록을 받는다(저장도 함께 일어남). */
export const verifyPlacement = async (
  tripId: string,
  payload: PlacementSaveRequest
): Promise<PlacementSaveResponse> => {
  const response = await apiClient.post<PlacementSaveResponse>(
    API_PATH.VERIFY(tripId),
    payload
  );
  return response.data;
};

/** 일정 확정 — 전체 배치 스냅샷을 저장하고 trip 을 확정 처리한다. */
export const confirmPlacement = async (
  tripId: string,
  payload: PlacementSaveRequest
): Promise<PlacementSaveResponse> => {
  const response = await apiClient.post<PlacementSaveResponse>(
    API_PATH.CONFIRM(tripId),
    payload
  );
  return response.data;
};
