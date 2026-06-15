import { format } from 'date-fns';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ExactDate = { from: Date; to: Date; nights: number };
type FlexDate = { year: number; month: number; nights: number };

type CalendarStore = {
  type: 'exact' | 'flexible' | null;
  exactDate: ExactDate | null;
  flexDate: FlexDate | null;
  setExactDate: (value: ExactDate) => void;
  setFlexDate: (value: FlexDate) => void;
  clearExactDate: () => void;
  resetCalendar: () => void;
};

export const useCalendarStore = create<CalendarStore>()(
  persist(
    (set) => ({
      type: null,
      exactDate: null,
      flexDate: null,
      setExactDate: (value) =>
        set({ type: 'exact', exactDate: value, flexDate: null }),
      setFlexDate: (value) =>
        set({ type: 'flexible', flexDate: value, exactDate: null }),
      clearExactDate: () => set({ type: null, exactDate: null }),
      resetCalendar: () => set({ type: null, exactDate: null, flexDate: null }),
    }),
    {
      name: 'calendar-storage',
      storage: createJSONStorage(() => sessionStorage),
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

export const formatDateRangeLabel = (
  type: CalendarStore['type'],
  exactDate: ExactDate | null,
  flexDate: FlexDate | null
): string => {
  if (type === 'exact' && exactDate) {
    return `${format(exactDate.from, 'M월d일')} ~ ${format(exactDate.to, 'M월d일')}`;
  }
  if (type === 'flexible' && flexDate) {
    return `${flexDate.year}년 ${flexDate.month}월`;
  }
  return '-';
};
