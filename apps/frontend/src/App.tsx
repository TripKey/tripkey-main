import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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

const App = () => {
  const [showSplash, setShowSplash] = useState(
    () => sessionStorage.getItem(SPLASH_SEEN_KEY) !== '1'
  );

  const handleSplashFinish = () => {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
    setShowSplash(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
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
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
