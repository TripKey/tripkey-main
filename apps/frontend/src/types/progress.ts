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
