import { useSearchParams } from 'react-router-dom';
import type { ProgressStatus } from '../types/progress';
import ProgressPage from './ProgressPage';

/**
 * 개발 전용 래퍼 — query param으로 4가지 상태를 시뮬레이션합니다.
 *
 * /progress?mock=loading&step=1
 * /progress?mock=parse-error
 * /progress?mock=empty-places
 * /progress?mock=group-error
 */
const ProgressPageDev = () => {
  const [params] = useSearchParams();
  const mock = params.get('mock') ?? 'loading';
  const step = Number(params.get('step') ?? '1') as 1 | 2 | 3;

  const status: ProgressStatus = (() => {
    switch (mock) {
      case 'parse-error':
        return { kind: 'parse-error' as const };
      case 'empty-places':
        return { kind: 'empty-places' as const };
      case 'group-error':
        return { kind: 'group-error' as const };
      default:
        return { kind: 'loading' as const, step };
    }
  })();

  return (
    <ProgressPage
      status={status}
      onRetry={() => alert('→ SCR-02로 이동 (미구현)')}
      onGoBack={() => alert('→ SCR-02로 복귀 (미구현)')}
      onContinue={() => alert('→ SCR-03으로 이동 (미구현)')}
    />
  );
};

export default ProgressPageDev;
