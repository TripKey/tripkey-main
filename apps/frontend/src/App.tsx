import { BrowserRouter, Routes, Route } from 'react-router-dom';

import DevIndexPage from './pages/DevIndexPage';
import DumpPage from './pages/DumpPage';
import HeaderPreviewPage from './pages/HeaderPreviewPage';
import OnboardingPage from './pages/OnboardingPage';
import ProgressPageDev from './pages/ProgressPageDev';

const App = () => {
  const tripId = '550e8400-e29b-41d4-a716-446655440000';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DevIndexPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dump" element={<DumpPage tripId={tripId} />} />
        <Route path="/progress" element={<ProgressPageDev />} />
        <Route path="/header-preview" element={<HeaderPreviewPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
