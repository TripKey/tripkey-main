import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

import RequireTrip from './components/common/RequireTrip';
import SplashScreen from './components/common/SplashScreen';
import { queryClient } from './lib/query-client';
import ArrangePage from './pages/ArrangePage';
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

  // CTA로 온보딩 진입 — 스플래시 없이 바로 이동하고, 온보딩 카드가 스스로 떠오른다.
  const startPlanning = () => {
    navigate('/onboarding');
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={<MainPage onStartPlanning={startPlanning} />}
        />
        <Route path="/onboarding" element={<OnboardingPage />} />
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
