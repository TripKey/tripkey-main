import posthog from 'posthog-js';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { FlightInput, AccommodationInput } from '../types/dump';

import { DUMP_TEXT } from './constants';
import { submitDumpText, parseDumpApiError } from './dump-api';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

type FlightRow = { airport: string; flightNumber: string; time: string };
type FlightForm = { departure: FlightRow; return: FlightRow };
type Accommodation = {
  id: string;
  name: string;
  location: string;
  checkIn: string;
  checkOut: string;
};

const emptyRow = (): FlightRow => ({ airport: '', flightNumber: '', time: '' });
const emptyAccommodation = (): Accommodation => ({
  id: crypto.randomUUID(),
  name: '',
  location: '',
  checkIn: '',
  checkOut: '',
});

// "yyyy-MM-dd HH:mm" 끼리 a가 b보다 명확히 이전인지 판단.
// 같은 날인데 한쪽만 시간이 있으면 비교 불가 → false(정리하지 않음).
const isDateTimeBefore = (a: string, b: string): boolean => {
  const [aDate, aTime = ''] = a.trim().split(' ');
  const [bDate, bTime = ''] = b.trim().split(' ');
  if (!aDate || !bDate) return false;
  if (aDate !== bDate) return aDate < bDate;
  if (aTime && bTime) return aTime < bTime;
  return false;
};

type DumpStore = {
  dumpText: string;
  flightForm: FlightForm;
  accommodations: Accommodation[];
  requestStatus: RequestStatus;
  errorMessage: string | null;
  jobId: string | null;

  actions: {
    setDumpText: (text: string) => void;
    updateFlight: (
      section: 'departure' | 'return',
      field: keyof FlightRow,
      value: string
    ) => void;
    addAccommodation: () => void;
    removeAccommodation: (id: string) => void;
    updateAccommodation: (
      id: string,
      field: keyof Omit<Accommodation, 'id'>,
      value: string
    ) => void;
    resetDump: () => void;
    clearJob: () => void;
    submitDump: (tripId: string) => Promise<boolean>;
  };
};

export const useDumpStore = create<DumpStore>()(
  persist(
    (set, get) => ({
      dumpText: '',
      flightForm: { departure: emptyRow(), return: emptyRow() },
      accommodations: [emptyAccommodation()],
      requestStatus: 'idle',
      errorMessage: null,
      jobId: null,

      actions: {
        setDumpText: (text) => {
          set({ dumpText: text });
        },

        updateFlight: (section, field, value) => {
          set((s) => {
            const nextSection = { ...s.flightForm[section], [field]: value };
            const next = { ...s.flightForm, [section]: nextSection };
            // 출발 시각을 귀국보다 늦게 바꾸면 무효해진 귀국 시각 정리
            if (
              section === 'departure' &&
              field === 'time' &&
              next.return.time &&
              isDateTimeBefore(next.return.time, value)
            ) {
              next.return = { ...next.return, time: '' };
            }
            return { flightForm: next };
          });
        },

        addAccommodation: () => {
          set((s) => ({
            accommodations: [...s.accommodations, emptyAccommodation()],
          }));
        },

        removeAccommodation: (id) => {
          set((s) => ({
            accommodations: s.accommodations.filter((a) => a.id !== id),
          }));
        },

        updateAccommodation: (id, field, value) => {
          set((s) => ({
            accommodations: s.accommodations.map((a) => {
              if (a.id !== id) return a;
              const next = { ...a, [field]: value };
              // 체크인을 체크아웃보다 늦게 바꾸면 무효해진 체크아웃 정리
              if (
                field === 'checkIn' &&
                next.checkOut &&
                isDateTimeBefore(next.checkOut, value)
              ) {
                next.checkOut = '';
              }
              return next;
            }),
          }));
        },

        resetDump: () => {
          set({
            dumpText: '',
            flightForm: { departure: emptyRow(), return: emptyRow() },
            accommodations: [emptyAccommodation()],
            requestStatus: 'idle',
            errorMessage: null,
            jobId: null,
          });
        },

        clearJob: () => {
          set({
            requestStatus: 'idle',
            errorMessage: null,
            jobId: null,
          });
        },

        submitDump: async (tripId: string) => {
          const { dumpText, flightForm, accommodations, requestStatus } = get();

          if (requestStatus === 'loading') {
            return false;
          }

          set({
            requestStatus: 'loading',
            errorMessage: null,
          });

          const trim = (v: string) => v.trim();

          // 섹션(출발/귀국) 1개를 항공편 1편으로 매핑.
          // arrival_airport는 UI에 입력칸이 없어 비움(나머지 3칸만 전송).
          const buildFlight = (row: FlightRow): FlightInput | undefined => {
            const flight: FlightInput = {
              departure_airport: trim(row.airport) || undefined,
              flight_number: trim(row.flightNumber) || undefined,
              datetime: trim(row.time) || undefined,
            };
            // 입력이 하나도 없으면 통째로 생략
            return Object.values(flight).some(Boolean) ? flight : undefined;
          };

          const departure_flight = buildFlight(flightForm.departure);
          const return_flight = buildFlight(flightForm.return);

          const accommodation_inputs: AccommodationInput[] = accommodations
            .map((a) => ({
              name: trim(a.name) || undefined,
              location: trim(a.location) || undefined,
              check_in: trim(a.checkIn) || undefined, // camel → snake
              check_out: trim(a.checkOut) || undefined,
            }))
            .filter((a) => Object.values(a).some(Boolean));

          try {
            const response = await submitDumpText(tripId, {
              dump_text: dumpText,
              ...(departure_flight && { departure_flight }),
              ...(return_flight && { return_flight }),
              ...(accommodation_inputs.length && { accommodation_inputs }),
            });
            set({ requestStatus: 'success', jobId: response.job_id });
            posthog.capture('dump_submitted');
            return true;
          } catch (error) {
            set({
              requestStatus: 'error',
              errorMessage:
                parseDumpApiError(error)?.message ??
                '서버 통신 오류가 발생했습니다.',
            });
            return false;
          }
        },
      },
    }),
    {
      name: 'dump-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        dumpText:
          state.dumpText.length >= DUMP_TEXT.MIN_LENGTH ? state.dumpText : '',
        flightForm: state.flightForm,
        accommodations: state.accommodations,
      }),
    }
  )
);
