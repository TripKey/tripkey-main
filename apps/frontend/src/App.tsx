import { BrowserRouter, Routes, Route } from 'react-router-dom';

import ArrangePage from './pages/ArrangePage';
import ConfirmPage from './pages/ConfirmPage';
import DevIndexPage from './pages/DevIndexPage';
import DumpPage from './pages/DumpPage';
import GroupingPage from './pages/GroupingPage';
import OnboardingPage from './pages/OnboardingPage';
import ProgressPageDev from './pages/ProgressPageDev';

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DevIndexPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/dump" element={<DumpPage />} />
        <Route path="/progress" element={<ProgressPageDev />} />
        <Route path="/grouping" element={<GroupingPage />} />
        <Route path="/arrange" element={<ArrangePage />} />
        <Route path="/confirm" element={<ConfirmPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
