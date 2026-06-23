import axios from 'axios';

import type {
  ApiErrorBody,
  Card,
  CardAddRequest,
  CardPatchRequest,
  CardsResponse,
  Groups03Response,
} from '../types/grouping-api';

import { apiClient } from './api-client';
import { API_PATH } from './constants';

export const fetchCards = async (tripId: string): Promise<CardsResponse> => {
  const response = await apiClient.get<CardsResponse>(API_PATH.CARDS(tripId));
  return response.data;
};

export const fetchGroups03 = async (
  tripId: string
): Promise<Groups03Response> => {
  const response = await apiClient.get<Groups03Response>(
    API_PATH.GROUPS(tripId),
    { params: { view: '03' } }
  );
  return response.data;
};

export const patchCard = async (
  tripId: string,
  instanceId: string,
  payload: CardPatchRequest
): Promise<Card> => {
  const response = await apiClient.patch<Card>(
    API_PATH.CARD(tripId, instanceId),
    payload
  );
  return response.data;
};

export const addCard = async (
  tripId: string,
  payload: CardAddRequest
): Promise<Card> => {
  const response = await apiClient.post<Card>(API_PATH.CARDS(tripId), payload);
  return response.data;
};

export const parseGroupingApiError = (error: unknown): ApiErrorBody | null => {
  if (!axios.isAxiosError(error)) {
    return null;
  }
  return (error.response?.data as ApiErrorBody | undefined) ?? null;
};
