import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import SplashScreen from './components/common/SplashScreen';
import ArrangePage from './pages/ArrangePage';
import ConfirmPage from './pages/ConfirmPage';
import DumpPage from './pages/DumpPage';
import GroupingPage from './pages/GroupingPage';
import OnboardingPage from './pages/OnboardingPage';
import ProgressPageDev from './pages/ProgressPageDev';

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dump" element={<DumpPage />} />
        <Route path="/progress" element={<ProgressPageDev />} />
        <Route path="/grouping" element={<GroupingPage />} />
        <Route path="/arrange" element={<ArrangePage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
      </Routes>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
    </BrowserRouter>
  );
};

export default App;
