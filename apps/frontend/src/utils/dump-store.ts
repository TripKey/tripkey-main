import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DUMP_TEXT } from './constants';
import { submitDumpText, parseDumpApiError } from './dump-api';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

type DumpStore = {
  dumpText: string;
  requestStatus: RequestStatus;
  errorMessage: string | null;
  jobId: string | null;

  actions: {
    setDumpText: (text: string) => void;
    resetDump: () => void;
    submitDump: (tripId: string) => Promise<boolean>;
  };
};

export const useDumpStore = create<DumpStore>()(
  persist(
    (set, get) => ({
      dumpText: '',
      requestStatus: 'idle',
      errorMessage: null,
      jobId: null,

      actions: {
        setDumpText: (text) => {
          set({ dumpText: text });
        },

        resetDump: () => {
          set({
            dumpText: '',
            requestStatus: 'idle',
            errorMessage: null,
            jobId: null,
          });
        },

        submitDump: async (tripId: string) => {
          const { dumpText, requestStatus } = get();

          if (requestStatus === 'loading') {
            return false;
          }

          set({
            requestStatus: 'loading',
            errorMessage: null,
          });

          try {
            const response = await submitDumpText(tripId, {
              dump_text: dumpText,
            });

            set({
              requestStatus: 'success',
              jobId: response.job_id,
            });

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
      partialize: (state) => ({
        dumpText:
          state.dumpText.length >= DUMP_TEXT.MIN_LENGTH ? state.dumpText : '',
      }),
    }
  )
);
