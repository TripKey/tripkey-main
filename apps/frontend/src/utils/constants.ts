export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://backend:8080';

export const API_PATH = {
  DUMP: (tripId: string) => `/trips/${tripId}/dump`,
  ONBOARDING: '/trips',
} as const;

export const DUMP_TEXT = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 3000,
  WARNING_LENGTH: 2700,
} as const;
