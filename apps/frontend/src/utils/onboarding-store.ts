import { create } from 'zustand';

import type { OnboardingRequest } from '../types/onboarding';

import { createTrip, parseOnboardingApiError } from './onboarding-api';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

type OnboardingStore = {
  form: OnboardingRequest;
  tripId: string | null;
  requestStatus: RequestStatus;
  errorMessage: string | null;

  actions: {
    setForm: (form: Partial<OnboardingRequest>) => void;
    setTripId: (tripId: string | null) => void;
    submitOnboarding: () => Promise<boolean>;
  };
};

export const useOnboardingStore = create<OnboardingStore>()((set, get) => ({
  form: {
    destinations: [],
    travel_days: 0,
    companion_count: 1,
    has_flight: false,
    has_accommodation: false,
  },
  tripId: null,
  requestStatus: 'idle',
  errorMessage: null,

  actions: {
    setForm: (partial) =>
      set((state) => ({ form: { ...state.form, ...partial } })),

    setTripId: (tripId) => set({ tripId }),

    submitOnboarding: async () => {
      if (get().requestStatus === 'loading') return false;
      set({ requestStatus: 'loading', errorMessage: null });

      try {
        const result = await createTrip(get().form);
        set({ requestStatus: 'success', tripId: result.trip_id });
        return true;
      } catch (error) {
        set({
          requestStatus: 'error',
          errorMessage:
            parseOnboardingApiError(error)?.message ??
            '서버 통신 오류가 발생했습니다.',
        });
        return false;
      }
    },
  },
}));
