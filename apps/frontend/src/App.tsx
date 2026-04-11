import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DevIndexPage from './pages/DevIndexPage';
import DumpPage from './pages/DumpPage';
import ProgressPageDev from './pages/ProgressPageDev';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DevIndexPage />} />
        <Route path="/dump" element={<DumpPage />} />
        <Route path="/progress" element={<ProgressPageDev />} />
      </Routes>
    </BrowserRouter>
  );
}