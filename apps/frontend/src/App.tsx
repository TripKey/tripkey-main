import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DumpPage from './pages/DumpPage';
import ProgressPageDev from './pages/ProgressPageDev';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DumpPage />} />
        <Route path="/progress" element={<ProgressPageDev />} />
      </Routes>
    </BrowserRouter>
  );
}