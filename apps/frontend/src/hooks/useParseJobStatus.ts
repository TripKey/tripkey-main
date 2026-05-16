import { useEffect, useState } from 'react';

import {
  mapParseJobResponseToView,
  type ParseJobView,
} from '../types/progress';
import { fetchParseJobStatus } from '../utils/progress-api';

const POLLING_INTERVAL_MS = 1500;

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

    setView({ kind: 'loading', step: 1 });

    const tick = async () => {
      try {
        const res = await fetchParseJobStatus(tripId, jobId);
        if (cancelled) return;
        const next = mapParseJobResponseToView(res);
        setView(next);
        if (next.kind === 'loading') {
          timer = setTimeout(tick, POLLING_INTERVAL_MS);
        }
      } catch {
        if (cancelled) return;
        setView({ kind: 'parse-error' });
      }
    };

    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [tripId, jobId]);

  return view;
};
