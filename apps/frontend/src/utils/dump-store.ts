import { create } from 'zustand';
import { submitDumpText, parseDumpApiError } from './dump-api';

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

interface DumpStoreState {
  dumpText: string;
  requestStatus: RequestStatus;
  errorMessage: string | null;
  jobId: string | null;
}

interface DumpStoreActions {
  setDumpText: (text: string) => void;
  submitDump: (tripId: string) => Promise<boolean>;
  resetDump: () => void;
}

type DumpStore = DumpStoreState & DumpStoreActions;

export const useDumpStore = create<DumpStore>((set, get) => ({
  dumpText: '',
  requestStatus: 'idle',
  errorMessage: null,
  jobId: null,

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
        dumpText: dumpText,
      });

      set({
        requestStatus: 'success',
        jobId: response.jobId,
      });
      return true;
    } catch (error) {
      const parsedError = parseDumpApiError(error);

      set({
        requestStatus: 'error',
        errorMessage: parsedError?.message ?? '요청 중 문제가 발생했어요.',
      });
      return false;
    }
  },
}));
