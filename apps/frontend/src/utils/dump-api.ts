import axios from 'axios';

import type {
  DumpSubmitRequest,
  DumpSubmitResponse,
  ErrorResponse,
} from '../types/dump';

import { apiClient } from './api-client';
import { API_PATH } from './constants';

// Dump 제출 API 호출
export const submitDumpText = async (
  tripId: string,
  payload: DumpSubmitRequest
): Promise<DumpSubmitResponse> => {
  const response = await apiClient.post<DumpSubmitResponse>(
    API_PATH.DUMP(tripId),
    payload
  );
  return response.data;
};

// Axios 에러 객체에서 서버 응답 추출
export const parseDumpApiError = (error: unknown): ErrorResponse | null => {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  return error.response?.data ?? null;
};
