import axios from 'axios';
import { apiClient } from './api-client';
import { API_PATH } from './constants';

import type {
  DumpSubmitRequest,
  DumpSubmitResponse,
  ErrorResponse,
} from '../types/dump';

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

export const parseDumpApiError = (error: unknown): ErrorResponse | null => {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  return error.response?.data ?? null;
};
