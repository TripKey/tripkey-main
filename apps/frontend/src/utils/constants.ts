export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const API_PATH = {
  DUMP: (tripId: string) => `/trips/${tripId}/dump`,
  ONBOARDING: '/trips',
  TRIP_DETAIL: (tripId: string) => `/trips/${tripId}`,
  CARDS: (tripId: string) => `/trips/${tripId}/cards`,
  CARD: (tripId: string, instanceId: string) =>
    `/trips/${tripId}/cards/${instanceId}`,
  GROUPS: (tripId: string) => `/trips/${tripId}/groups`,
  REORDER: (tripId: string) => `/trips/${tripId}/groups/reorder`,
  DAY: (tripId: string, dayNumber: number) =>
    `/trips/${tripId}/days/${dayNumber}`,
  VERIFY: (tripId: string) => `/trips/${tripId}/verify`,
  CONFIRM: (tripId: string) => `/trips/${tripId}/confirm`,
} as const;

export const DUMP_TEXT = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 3000,
  WARNING_LENGTH: 2700,
} as const;
