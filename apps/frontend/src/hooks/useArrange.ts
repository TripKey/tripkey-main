// 배치 화면(SCR-04) React Query 훅 모음.
// 좌측 목록(groups04)·우측 보드(cards)는 query 로 한 번 받아오고,
// 메모/추가/검증/확정은 mutation 으로 처리한다.

import { useMutation, useQuery } from '@tanstack/react-query';

import type { PlacementSaveRequest } from '@/types/arrange-api';
import type { CardAddRequest, CardPatchRequest } from '@/types/grouping-api';

import {
  confirmPlacement,
  fetchGroups04,
  verifyPlacement,
} from '../utils/arrange-api';
import { addCard, fetchCards, patchCard } from '../utils/grouping-api';

export const arrangeKeys = {
  groups04: (tripId: string) => ['arrange', tripId, 'groups04'] as const,
  cards: (tripId: string) => ['arrange', tripId, 'cards'] as const,
};

export const useGroups04Query = (tripId: string | null) =>
  useQuery({
    queryKey: arrangeKeys.groups04(tripId ?? ''),
    queryFn: () => fetchGroups04(tripId as string),
    enabled: Boolean(tripId),
  });

export const useArrangeCardsQuery = (tripId: string | null) =>
  useQuery({
    queryKey: arrangeKeys.cards(tripId ?? ''),
    queryFn: () => fetchCards(tripId as string),
    enabled: Boolean(tripId),
  });

export const usePatchCardMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (vars: { instanceId: string; payload: CardPatchRequest }) =>
      patchCard(tripId as string, vars.instanceId, vars.payload),
  });

export const useAddCardMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (payload: CardAddRequest) => addCard(tripId as string, payload),
  });

export const useVerifyPlacementMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (payload: PlacementSaveRequest) =>
      verifyPlacement(tripId as string, payload),
  });

export const useConfirmPlacementMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (payload: PlacementSaveRequest) =>
      confirmPlacement(tripId as string, payload),
  });
