import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DevIndexPage.css';

const DEFAULT_TRIP_ID = '550e8400-e29b-41d4-a716-446655440000';

const pages = [
  {
    path: '/onboarding',
    title: 'Onboarding Page',
    description: '온보딩 페이지',
  },
  {
    path: '/dump',
    title: 'Dump Page',
    description: '여행 정보 입력 페이지',
  },
  {
    path: '/progress',
    title: 'Progress Page',
    description: '진행 상태 페이지 (mock 파라미터로 상태 전환 가능)',
  },
];

const DevIndexPage = () => {
  const navigate = useNavigate();
  const [tripId, setTripId] = useState(DEFAULT_TRIP_ID);

  const handleOpenGrouping = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = tripId.trim();
    if (!trimmed) return;
    navigate(`/grouping?tripId=${encodeURIComponent(trimmed)}`);
  };

  return (
    <main className="dev-index-page">
      <h1>🛠 Dev Navigation</h1>
      <p className="dev-index-desc">개발 중인 페이지 목록입니다.</p>

      <ul className="dev-index-list">
        {pages.map(({ path, title, description }) => (
          <li key={path} className="dev-index-item">
            <Link to={path} className="dev-index-link">
              <strong>{title}</strong>
              <span className="dev-index-path">{path}</span>
              <span className="dev-index-description">{description}</span>
            </Link>
          </li>
        ))}

        <li className="dev-index-item">
          <form className="dev-index-link" onSubmit={handleOpenGrouping}>
            <strong>Grouping (SCR-03)</strong>
            <span className="dev-index-path">/grouping?tripId=…</span>
            <span className="dev-index-description">
              정보 정리하기 — 그룹화 화면 (실제 BE 연동)
            </span>
            <div className="dev-index-tripid-row">
              <input
                type="text"
                value={tripId}
                onChange={(event) => setTripId(event.target.value)}
                placeholder="trip UUID"
                className="dev-index-tripid-input"
                aria-label="trip ID"
              />
              <button type="submit" className="dev-index-tripid-button">
                이동
              </button>
            </div>
          </form>
        </li>
      </ul>
    </main>
  );
};

export default DevIndexPage;
