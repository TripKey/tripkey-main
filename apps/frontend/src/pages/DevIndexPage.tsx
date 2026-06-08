import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './DevIndexPage.css';

// 백엔드 시드 데이터(개발 DB)의 첫 trip id. 실 환경에선 존재하지 않을 수 있다.
const DEFAULT_TRIP_ID = '550e8400-e29b-41d4-a716-446655440000';

// 화면 흐름(SCR 번호) 순서대로 나열한다. grouping(SCR-03)만 tripId 입력 폼이 필요해
// 'grouping' 종류로 따로 렌더한다.
type DevNavEntry =
  | { kind: 'link'; path: string; title: string; description: string }
  | { kind: 'grouping' };

const pages: DevNavEntry[] = [
  {
    kind: 'link',
    path: '/onboarding',
    title: 'Onboarding Page',
    description: '온보딩 페이지',
  },
  {
    kind: 'link',
    path: '/dump',
    title: 'Dump Page',
    description: '여행 정보 입력 페이지',
  },
  {
    kind: 'link',
    path: '/progress',
    title: 'Progress Page',
    description: '진행 상태 페이지 (mock 파라미터로 상태 전환 가능)',
  },
  { kind: 'grouping' }, // SCR-03
  {
    kind: 'link',
    path: '/arrange',
    title: 'Arrange Page (SCR-04)',
    description: '일정 배치 페이지 — Day 칸반 보드 (목데이터 UI)',
  },
  {
    kind: 'link',
    path: '/confirm',
    title: 'Confirm Page (SCR-05)',
    description: '확정 전 최종 점검 페이지 (mock 데이터 기반 UI)',
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
        {pages.map((page) =>
          page.kind === 'grouping' ? (
            <li key="grouping" className="dev-index-item">
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
          ) : (
            <li key={page.path} className="dev-index-item">
              <Link to={page.path} className="dev-index-link">
                <strong>{page.title}</strong>
                <span className="dev-index-path">{page.path}</span>
                <span className="dev-index-description">
                  {page.description}
                </span>
              </Link>
            </li>
          )
        )}
      </ul>
    </main>
  );
};

export default DevIndexPage;
