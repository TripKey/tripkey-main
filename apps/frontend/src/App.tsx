import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import RequireTrip from './components/common/RequireTrip';
import SplashScreen from './components/common/SplashScreen';
import { queryClient } from './lib/query-client';
import ArrangePage from './pages/ArrangePage';
import ChatPrototypePage from './pages/ChatPrototypePage';
import ConfirmPage from './pages/ConfirmPage';
import DumpPage from './pages/DumpPage';
import GroupingPage from './pages/GroupingPage';
import MainPage from './pages/MainPage';
import OnboardingPage from './pages/OnboardingPage';

const SPLASH_SEEN_KEY = 'tripkey:splash-seen';

const AppContent = () => {
  const navigate = useNavigate();

  // 첫 진입 시 한 번 보여주는 스플래시.
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem(SPLASH_SEEN_KEY) !== '1'
  );
  const handleSplashFinish = () => {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    setShowSplash(false);
  };

  // CTA로 온보딩 진입 시: 먼저 라우트를 바꿔 스플래시 뒤에서 온보딩을 로드하고,
  // 스플래시가 덮은 채 페이드아웃되면 온보딩 화면이 드러난다(메인이 비치지 않음).
  const [transitioning, setTransitioning] = useState(false);
  const startPlanning = () => {
    navigate('/onboarding');
    setTransitioning(true);
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<MainPage onStartPlanning={startPlanning} />}
        />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/prototype/chat" element={<ChatPrototypePage />} />
        <Route
          path="/dump"
          element={
            <RequireTrip>
              <DumpPage />
            </RequireTrip>
          }
        />
        <Route
          path="/grouping"
          element={
            <RequireTrip>
              <GroupingPage />
            </RequireTrip>
          }
        />
        <Route
          path="/arrange"
          element={
            <RequireTrip>
              <ArrangePage />
            </RequireTrip>
          }
        />
        <Route
          path="/confirm"
          element={
            <RequireTrip>
              <ConfirmPage />
            </RequireTrip>
          }
        />
      </Routes>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      {transitioning && (
        <SplashScreen onFinish={() => setTransitioning(false)} />
      )}
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
