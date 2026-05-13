import { BrowserRouter, Routes, Route } from 'react-router-dom';

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
      </Routes>
    </BrowserRouter>
  );
};

export default App;
