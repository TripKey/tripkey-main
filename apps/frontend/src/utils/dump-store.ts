import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DUMP_TEXT } from './constants';
import { submitDumpText, parseDumpApiError } from './dump-api';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

type DumpStoreState = {
  dumpText: string;
  requestStatus: RequestStatus;
  errorMessage: string | null;
  jobId: string | null;
};

type DumpStoreActions = {
  setDumpText: (text: string) => void;
  submitDump: (tripId: string) => Promise<boolean>;
  resetDump: () => void;
};

type DumpStore = DumpStoreState & DumpStoreActions;

// Dump 상태 및 액션 관리 스토어
export const useDumpStore = create<DumpStore>()(
  persist(
    (set, get) => ({
      dumpText: '',
      requestStatus: 'idle',
      errorMessage: null,
      jobId: null,

      // 입력 텍스트 변경
      setDumpText: (text) => {
        set({ dumpText: text });
      },

      // 상태 초기화
      resetDump: () => {
        set({
          dumpText: '',
          requestStatus: 'idle',
          errorMessage: null,
          jobId: null,
        });
      },

      // Dump 제출 요청
      submitDump: async (tripId: string) => {
        const { dumpText, requestStatus } = get();

        // 요청 진행 중이면 중복 요청 방지
        if (requestStatus === 'loading') {
          return false;
        }

        // 요청 시작 상태
        set({
          requestStatus: 'loading',
          errorMessage: null,
        });

        try {
          const response = await submitDumpText(tripId, {
            dump_text: dumpText,
          });

          // 요청 성공 시 jobId 저장
          set({
            requestStatus: 'success',
            jobId: response.job_id,
          });

          return true;
        } catch (error) {
          const parsedError = parseDumpApiError(error);

          // 요청 실패 시 에러 메시지 저장
          set({
            requestStatus: 'error',
            errorMessage: parsedError?.message ?? '요청 중 문제가 발생했어요.',
          });

          return false;
        }
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
