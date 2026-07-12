import type {
  DayViewModel,
  Groups04Response,
  PlacementSaveRequest,
  PlacementSaveResponse,
  SuggestedItineraryResponse,
  SuggestedItineraryRequest,
  RouteLegsResponse,
} from '../types/arrange-api';

import { apiClient } from './api-client';
import { API_PATH } from './constants';

/** 좌측 "카드 목록"(배치 가능 스톡 + 결정/확인 필요 + 제외) */
export const fetchGroups04 = async (
  tripId: string
): Promise<Groups04Response> => {
  const response = await apiClient.get<Groups04Response>(
    API_PATH.GROUPS(tripId),
    { params: { view: '04' } }
  );
  return response.data;
};

/**
 * 정리 반영(재클러스터) — POST /groups/reorder.
 * 위치 정보가 바뀌어 "재정렬이 필요한 카드"(pending_reorder)로 빠져 있던 카드들의
 * 플래그를 BE 가 비워, 갱신된 groups04(클러스터로 재편입된 상태)를 돌려준다.
 */
export const reorderGroups = async (
  tripId: string
): Promise<Groups04Response> => {
  const response = await apiClient.post<Groups04Response>(
    API_PATH.REORDER(tripId)
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

/** 배치 가능한 카드를 지역별로 묶고 Day 내부 방문 순서를 최적화한 저장 전 제안. */
export const suggestItinerary = async (
  tripId: string,
  payload: SuggestedItineraryRequest
): Promise<SuggestedItineraryResponse> => {
  const response = await apiClient.post<SuggestedItineraryResponse>(
    API_PATH.SUGGEST_ITINERARY(tripId),
    payload
  );
  return response.data;
};

/** 현재 확정 배치 기준으로 캐시에 저장된 인접 장소 이동 구간을 조회한다. */
export const fetchRouteLegs = async (
  tripId: string
): Promise<RouteLegsResponse> => {
  const response = await apiClient.get<RouteLegsResponse>(
    API_PATH.ROUTE_LEGS(tripId)
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
