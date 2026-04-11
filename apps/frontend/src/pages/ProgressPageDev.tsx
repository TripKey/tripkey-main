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
  const [params, setParams] = useSearchParams();
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

  const mockButtons = [
    { label: '로딩 (1단계)', query: '?mock=loading&step=1' },
    { label: '로딩 (2단계)', query: '?mock=loading&step=2' },
    { label: '로딩 (3단계)', query: '?mock=loading&step=3' },
    { label: '파싱 에러', query: '?mock=parse-error' },
    { label: '빈 장소', query: '?mock=empty-places' },
    { label: '그룹 에러', query: '?mock=group-error' },
  ];

  return (
    <>
      <ProgressPage
        status={status}
        onRetry={() => alert('→ SCR-02로 이동 (미구현)')}
        onGoBack={() => alert('→ SCR-02로 복귀 (미구현)')}
        onContinue={() => alert('→ SCR-03으로 이동 (미구현)')}
      />
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        background: '#f5f5f5',
        borderTop: '1px solid #ddd',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {mockButtons.map(({ label, query }) => (
          <button
            key={query}
            onClick={() => setParams(new URLSearchParams(query.slice(1)))}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: `1px solid ${('?' + params.toString()) === query ? '#4a90d9' : '#ccc'}`,
              background: ('?' + params.toString()) === query ? '#4a90d9' : '#fff',
              color: ('?' + params.toString()) === query ? '#fff' : '#333',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: ('?' + params.toString()) === query ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  );
};

export default ProgressPageDev;
