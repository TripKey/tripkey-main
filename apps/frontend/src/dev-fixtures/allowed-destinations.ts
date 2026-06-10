// 차선책(임시 데이터):
// 백엔드의 도시 자동완성 API가 한글 완전일치만 지원하기 때문에, 어떤 도시가
// 검색 가능한지 사용자(개발 단계)에게 안내하기 위해 프론트가 임시로 들고 있는
// 목록이다. 정공법은 백엔드에 `/cities?available=true` 같은 엔드포인트를 만들어
// 받아오는 것 — 백엔드 작업이 완료되면 이 파일은 삭제하고 fetch 로 교체한다.
export const RECOMMENDED_DESTINATIONS = [
  { name: '오사카', country: '일본' },
  { name: '도쿄', country: '일본' },
  { name: '교토', country: '일본' },
  { name: '후쿠오카', country: '일본' },
  { name: '방콕', country: '태국' },
  { name: '하노이', country: '베트남' },
  { name: '다낭', country: '베트남' },
  { name: '싱가포르', country: '싱가포르' },
  { name: '타이베이', country: '대만' },
  { name: '파리', country: '프랑스' },
  { name: '런던', country: '영국' },
  { name: '뉴욕', country: '미국' },
] as const;
