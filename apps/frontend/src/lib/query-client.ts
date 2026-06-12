import { QueryClient } from '@tanstack/react-query';

// 앱 전역 React Query 클라이언트.
// 배치 화면은 서버 데이터를 한 번 받아 로컬 드래그앤드롭 상태로 편집하므로,
// 포커스 복귀 자동 refetch 로 사용자의 미저장 배치가 덮어써지지 않도록 끈다.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000,
    },
  },
});
