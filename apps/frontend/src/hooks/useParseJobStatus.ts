import axios from 'axios';
import { useEffect, useState } from 'react';

import {
  mapParseJobResponseToView,
  type ParseJobView,
} from '../types/progress';
import { fetchParseJobStatus } from '../utils/progress-api';

const POLLING_INTERVAL_MS = 1500;
const POLLING_TIMEOUT_MS = 60_000;
const MAX_CONSECUTIVE_ERRORS = 3;

// jobId === null 이면 폴링을 멈추고 idle 로 돌아간다. (clearJob() 호출 시 동작)
export const useParseJobStatus = (
  tripId: string | null,
  jobId: string | null
): ParseJobView => {
  const [view, setView] = useState<ParseJobView>({ kind: 'idle' });

  useEffect(() => {
    if (!tripId || !jobId) {
      setView({ kind: 'idle' });
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const controller = new AbortController();
    const startedAt = Date.now();
    let consecutiveErrors = 0;

    setView({ kind: 'loading', step: 1 });

    const tick = async () => {
      if (Date.now() - startedAt > POLLING_TIMEOUT_MS) {
        setView({ kind: 'parse-error' });
        return;
      }

      try {
        const res = await fetchParseJobStatus(tripId, jobId, controller.signal);
        if (cancelled) return;
        consecutiveErrors = 0;
        const next = mapParseJobResponseToView(res);
        setView(next);
        if (next.kind === 'loading') {
          timer = setTimeout(tick, POLLING_INTERVAL_MS);
        }
      } catch (error) {
        if (cancelled || axios.isCancel(error)) return;
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setView({ kind: 'parse-error' });
          return;
        }
        // 지수 백오프로 일시적 네트워크 오류 재시도
        timer = setTimeout(
          tick,
          POLLING_INTERVAL_MS * 2 ** (consecutiveErrors - 1)
        );
      }
    };

    tick();

    return () => {
      cancelled = true;
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [tripId, jobId]);

  return view;
};
