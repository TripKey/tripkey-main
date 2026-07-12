import axios from 'axios';

import type {
  ChatCardSaveRequest,
  ChatCardSaveResponse,
  ChatContext,
  ChatParseRequest,
  ChatParseResponse,
} from '@/types/chat-api';
import type { ApiErrorBody } from '@/types/grouping-api';

import { apiClient } from './api-client';
import { API_PATH } from './constants';

export const parseChat = async (
  tripId: string,
  payload: ChatParseRequest
): Promise<ChatParseResponse> => {
  const response = await apiClient.post<ChatParseResponse>(
    API_PATH.CHAT_PARSE(tripId),
    payload
  );
  return normalizeParseResponse(response.data, payload.context);
};

export const saveChatCards = async (
  tripId: string,
  payload: ChatCardSaveRequest
): Promise<ChatCardSaveResponse> => {
  const response = await apiClient.post<ChatCardSaveResponse>(
    API_PATH.CHAT_CARDS(tripId),
    payload
  );
  return normalizeSaveResponse(response.data);
};

const normalizeParseResponse = (
  data: ChatParseResponse,
  fallbackContext: ChatContext
): ChatParseResponse => ({
  intent: data.intent ?? 'no_action',
  reply:
    data.reply ??
    '채팅 응답을 불러왔지만 일부 정보가 비어 있어요. 다시 한 번 요청해주세요.',
  updated_context: {
    interests: Array.isArray(data.updated_context?.interests)
      ? data.updated_context.interests
      : fallbackContext.interests,
    constraints: Array.isArray(data.updated_context?.constraints)
      ? data.updated_context.constraints
      : fallbackContext.constraints,
  },
  suggested_cards: Array.isArray(data.suggested_cards)
    ? data.suggested_cards
    : [],
  duplicates: Array.isArray(data.duplicates) ? data.duplicates : [],
});

const normalizeSaveResponse = (
  data: ChatCardSaveResponse
): ChatCardSaveResponse => ({
  created_cards: Array.isArray(data.created_cards) ? data.created_cards : [],
  duplicates: Array.isArray(data.duplicates) ? data.duplicates : [],
});

export const chatErrorMessage = (error: unknown): string => {
  if (!axios.isAxiosError(error)) {
    return '채팅 요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.';
  }
  const body = error.response?.data as ApiErrorBody | undefined;
  if (error.response?.status === 503) {
    return 'AI 추천 서비스가 잠시 혼잡해요. 잠시 후 다시 시도해주세요.';
  }
  if (error.response?.status === 502) {
    return 'AI 추천 서비스에 연결하지 못했어요. 잠시 후 다시 시도해주세요.';
  }
  return (
    body?.message ?? '채팅 요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
  );
};
