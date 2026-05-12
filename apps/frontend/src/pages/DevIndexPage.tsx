import { Link } from 'react-router-dom';
import './DevIndexPage.css';

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
  {
    path: '/grouping',
    title: 'Grouping (SCR-03)',
    description: '정보 정리하기 — 그룹화 화면 UI (목데이터)',
  },
];

const DevIndexPage = () => {
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
      </ul>
    </main>
  );
};

export default DevIndexPage;
