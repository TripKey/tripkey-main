// 배치 화면(SCR-04) React Query 훅 모음.
// 좌측 목록(groups04)·우측 보드(cards)는 query 로 한 번 받아오고,
// 메모/추가/검증/확정은 mutation 으로 처리한다.

import { useMutation, useQueries, useQuery } from '@tanstack/react-query';

import type { DayViewModel, PlacementSaveRequest, SuggestedItineraryRequest } from '@/types/arrange-api';
import type { CardAddRequest, CardPatchRequest } from '@/types/grouping-api';

import {
  confirmPlacement,
  fetchDay,
  fetchGroups04,
  fetchRouteLegs,
  reorderGroups,
  suggestItinerary,
  verifyPlacement,
} from '../utils/arrange-api';
import {
  addCard,
  duplicateCard,
  fetchCards,
  patchCard,
} from '../utils/grouping-api';

export const arrangeKeys = {
  groups04: (tripId: string) => ['arrange', tripId, 'groups04'] as const,
  cards: (tripId: string) => ['arrange', tripId, 'cards'] as const,
  day: (tripId: string, dayNumber: number) =>
    ['arrange', tripId, 'day', dayNumber] as const,
  routeLegs: (tripId: string) => ['arrange', tripId, 'route-legs'] as const,
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
    // 좌표(Places) enrichment가 끝나기 전에 화면에 들어와도 지도가 비지 않도록,
    // 처리 중(processing) 카드가 있으면 자동으로 다시 받아오고 모두 정착되면 멈춘다.
    // dataUpdateCount 로 상한을 둬(최대 ~30초) 무한 폴링을 방지한다.
    refetchInterval: (query) => {
      const cards = query.state.data?.cards;
      if (!cards) return false;
      const pending = cards.some(
        (card) => card.processing_status === 'processing'
      );
      if (!pending) return false;
      return query.state.dataUpdateCount > 15 ? false : 2000;
    },
  });

export const useRouteLegsQuery = (tripId: string | null) =>
  useQuery({
    queryKey: arrangeKeys.routeLegs(tripId ?? ''),
    queryFn: () => fetchRouteLegs(tripId as string),
    enabled: Boolean(tripId),
  });

/**
 * 우측 Day 보드 — 백엔드 GET /days/{n} 를 day 1..dayCount 만큼 받아온다.
 * Day별 카드 그룹핑/정렬/항공편 분리는 서버(DayViewService)가 SSOT 이므로 FE 는 재현하지 않는다.
 * combine 으로 결과를 묶어 day 순서대로 정렬된 DayViewModel 배열과 로딩 상태를 돌려준다.
 */
export const useDaysQuery = (tripId: string | null, dayCount: number) =>
  useQueries({
    queries: Array.from({ length: Math.max(dayCount, 0) }, (_, i) => ({
      queryKey: arrangeKeys.day(tripId ?? '', i + 1),
      queryFn: () => fetchDay(tripId as string, i + 1),
      enabled: Boolean(tripId),
    })),
    combine: (results) => ({
      // day 1..dayCount 순서 보장(queries 배열 순서 == day 순서).
      dayViewModels: results.map((r) => r.data) as (DayViewModel | undefined)[],
      isLoaded: results.length > 0 && results.every((r) => r.data != null),
      isError: results.some((r) => r.isError),
    }),
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

export const useDuplicateCardMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (instanceId: string) =>
      duplicateCard(tripId as string, instanceId),
  });

export const useReorderGroupsMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: () => reorderGroups(tripId as string),
  });

export const useVerifyPlacementMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (payload: PlacementSaveRequest) =>
      verifyPlacement(tripId as string, payload),
  });

export const useSuggestedItineraryMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (payload: SuggestedItineraryRequest) =>
      suggestItinerary(tripId as string, payload),
  });

export const useConfirmPlacementMutation = (tripId: string | null) =>
  useMutation({
    mutationFn: (payload: PlacementSaveRequest) =>
      confirmPlacement(tripId as string, payload),
  });
