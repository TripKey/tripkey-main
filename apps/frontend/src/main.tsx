import posthog from 'posthog-js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './App.css';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  capture_pageview: 'history_change',
  // 전송 직전 훅 — URL 쿼리에 tripId 등 내부 식별자가 실려 나가지 않도록 경로만 남긴다.
  sanitize_properties: (properties) => ({
    ...properties,
    $current_url: properties.$current_url?.split('?')[0],
    $referrer: properties.$referrer?.split('?')[0],
  }),
  loaded: (ph) => {
    // 로컬 개발 중 클릭이 실사용자 데이터에 섞이지 않도록 수집을 끈다.
    if (import.meta.env.DEV) ph.opt_out_capturing();
  },
});

// super property — 이후 모든 이벤트에 environment 가 자동으로 붙는다.
posthog.register({
  environment: import.meta.env.VITE_APP_ENV ?? 'development',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
