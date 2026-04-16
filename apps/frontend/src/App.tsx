import { BrowserRouter, Routes, Route } from 'react-router-dom';

import DevIndexPage from './pages/DevIndexPage';
import DumpPage from './pages/DumpPage';
import ProgressPageDev from './pages/ProgressPageDev';

export default function App() {
  const tripId = '550e8400-e29b-41d4-a716-446655440000';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DevIndexPage />} />
        <Route path="/dump" element={<DumpPage tripId={tripId} />} />
        <Route path="/progress" element={<ProgressPageDev />} />
      </Routes>
    </BrowserRouter>
  );
}
