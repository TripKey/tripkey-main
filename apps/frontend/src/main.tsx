import posthog from 'posthog-js';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './App.css';

posthog.init(import.meta.env.VITE_PUBLIC_POSTHOG_KEY, {
  api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
  capture_pageview: 'history_change',
  loaded: (ph) => {
    // 로컬 개발 중 클릭이 실사용자 데이터에 섞이지 않도록 수집을 끈다.
    if (import.meta.env.DEV) ph.opt_out_capturing();
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
