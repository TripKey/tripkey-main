import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ExactDate = { from: Date; to: Date; nights: number };
type FlexDate = { year: number; month: number; nights: number };

type CalendarStore = {
  type: 'exact' | 'flexible' | null;
  exactDate: ExactDate | null;
  flexDate: FlexDate | null;
  setExactDate: (value: ExactDate) => void;
  setFlexDate: (value: FlexDate) => void;
  clearExactDate: () => void;
};

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set) => ({
      type: null,
      exactDate: null,
      flexDate: null,
      setExactDate: (value) => set({ type: 'exact', exactDate: value }),
      setFlexDate: (value) => set({ type: 'flexible', flexDate: value }),
      clearExactDate: () => set({ type: null, exactDate: null }),
    }),
    {
      name: 'calendar-storage',
      partialize: (state) => ({
        type: state.type,
        exactDate: state.exactDate,
        flexDate: state.flexDate,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<
          Pick<CalendarStore, 'type' | 'exactDate' | 'flexDate'>
        >;
        return {
          ...currentState,
          ...persisted,
          exactDate: persisted.exactDate
            ? {
                from: new Date(persisted.exactDate.from),
                to: new Date(persisted.exactDate.to),
                nights: persisted.exactDate.nights,
              }
            : null,
        };
      },
    }
  )
);
