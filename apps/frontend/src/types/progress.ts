export type ProgressStatus =
  | { kind: 'loading'; step: 1 | 2 | 3 }
  | { kind: 'parse-error' }
  | { kind: 'empty-places' }
  | { kind: 'group-error' };

export const STEP_TEXTS: Record<1 | 2 | 3, string> = {
  1: '입력한 정보를 분석하고 있어요...',
  2: '장소를 지역별로 묶고 있어요...',
  3: '인사이트를 정리하고 있어요...',
};

export type ParseJobApiStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export type ParseJobErrorCode =
  | 'PARSE_FAILED'
  | 'NO_PLACES_FOUND'
  | 'GROUPING_FAILED';

export type ParseJobStatusResponse = {
  job_id: string;
  status: ParseJobApiStatus;
  step: 1 | 2 | 3;
  error_code: ParseJobErrorCode | null;
};

export type ParseJobView =
  | { kind: 'idle' }
  | { kind: 'loading'; step: 1 | 2 | 3 }
  | { kind: 'parse-error' }
  | { kind: 'empty-places' }
  | { kind: 'group-error' }
  | { kind: 'done' };

export const mapParseJobResponseToView = (
  res: ParseJobStatusResponse
): ParseJobView => {
  if (res.status === 'completed') return { kind: 'done' };
  if (res.status === 'failed') {
    switch (res.error_code) {
      case 'NO_PLACES_FOUND':
        return { kind: 'empty-places' };
      case 'GROUPING_FAILED':
        return { kind: 'group-error' };
      case 'PARSE_FAILED':
      default:
        return { kind: 'parse-error' };
    }
  }
  return { kind: 'loading', step: res.step };
};
