import { create } from 'zustand';

type ExactDate = { from: Date; to: Date; nights: number };
type FlexDate = { year: number; month: number; nights: number };

type CalendarStore = {
  type: 'exact' | 'flexible' | null;
  exactDate: ExactDate | null;
  flexDate: FlexDate | null;
  setExactDate: (value: ExactDate) => void;
  setFlexDate: (value: FlexDate) => void;
};

export const useCalendarStore = create<CalendarStore>((set) => ({
  type: null,
  exactDate: null,
  flexDate: null,
  setExactDate: (value) => set({ type: 'exact', exactDate: value }),
  setFlexDate: (value) => set({ type: 'flexible', flexDate: value }),
}));
