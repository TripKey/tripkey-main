import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import LoginModal from './components/auth/LoginModal';
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

// 세션 리셋(로고/확정 화면) 직후에만 스플래시를 띄운다.
// 리셋 시 sessionStorage.clear() 후 이 플래그를 심고 리로드하므로,
// 일반 첫 진입(플래그 없음)에는 스플래시가 뜨지 않는다.
const SPLASH_FLAG_KEY = 'tripkey:show-splash';

const AppContent = () => {
  const navigate = useNavigate();

  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem(SPLASH_FLAG_KEY) === '1'
  );
  const handleSplashFinish = () => {
    sessionStorage.removeItem(SPLASH_FLAG_KEY); // 일회용 — 소비
    setShowSplash(false);
  };

  // CTA로 온보딩 진입 — 스플래시 없이 바로 이동하고, 온보딩 카드가 스스로 떠오른다.
  const startPlanning = () => {
    navigate('/onboarding');
  };

  const [loginOpen, setLoginOpen] = useState(false);
  const openLogin = () => setLoginOpen(true);

  return (
    <>
      <Routes>
        <Route path="/" element={<MainPage onStartPlanning={openLogin} />} />
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
      <LoginModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        onProceed={startPlanning}
      />
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
