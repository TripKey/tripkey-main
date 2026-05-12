import axios from 'axios';

import type { OnboardingRequest, OnboardingResponse, OnboardingErrorResponse } from '../types/onboarding';
import { apiClient } from './api-client';
import { API_PATH } from './constants';

export const createTrip = async (
  payload: OnboardingRequest
): Promise<OnboardingResponse> => {
  const response = await apiClient.post<OnboardingResponse>(
    API_PATH.ONBOARDING,
    payload
  );
  return response.data;
};

export const parseOnboardingApiError = (error: unknown): OnboardingErrorResponse | null => {
  if (!axios.isAxiosError(error)) return null;
  return error.response?.data ?? null;
};


