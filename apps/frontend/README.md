## TripKey Frontend

React/Vite 기반의 TripKey 웹 클라이언트입니다. 온보딩, 덤프 입력, 카드 정리, Day 배치, 최종 확인 화면을 담당합니다.

현재 실행 환경은 `npm + Vite + Node.js 22` 기준입니다.

## 주요 기술

- React 19
- React Router 7
- TanStack React Query
- Axios
- Tailwind CSS 4
- shadcn/radix-ui 기반 UI 컴포넌트
- Google Maps React integration

## 개발 가이드

- 설치: `npm install`
- dev server: `npm run dev` (`http://localhost:3000`)
- build: `npm run build`
- lint 검사: `npm run lint`
- 자동 수정 가능한 항목 정리: `npm run lint:fix`

초기 도입 단계이므로 lint는 warning 중심으로 운영합니다.
파일/폴더 네이밍 규칙과 import 순서 등 핵심 컨벤션은 유지하고,
Prettier는 우선 warning으로 안내합니다.

## 환경변수

`.env.example`을 `.env`로 복사해 사용합니다.

- `VITE_API_BASE_URL`: 프론트가 호출하는 API base path. dev/prod 기본값은 `/api`입니다.
- `VITE_DEV_PROXY_TARGET`: Vite dev server가 `/api` 요청을 전달할 백엔드 주소입니다.
- `VITE_GOOGLE_MAPS_API_KEY`: 최종 확인 지도 렌더링에 사용합니다.

dev 환경에서는 Vite가 `/api/*`를 백엔드 `/v1/*`로 rewrite합니다. 운영 환경에서는 nginx가 프록시 역할을 합니다.

## 라우트

- `/onboarding`: 여행 기본 정보 입력
- `/dump`: 여행 자료 덤프 입력
- `/grouping`: 카드 정리 및 카드 추가/수정
- `/arrange`: Day 배치, 재정렬, verify/confirm 호출
- `/confirm`: 확정 결과 확인

`/dump` 이후 화면은 `RequireTrip`으로 여행 세션 또는 `tripId`가 필요합니다.

## 현재 연동 상태

- 카드 조회/추가/수정은 백엔드 API와 연결되어 있습니다.
- 03/04 그룹 조회, Day 조회, verify, confirm 호출은 백엔드 API와 연결되어 있습니다.
- 05 최종 확인 화면의 일정/카드/alert는 실데이터 기반입니다.
- 05의 전반 체크리스트, 일부 요약 문장, hero stats, 저장/공유 액션은 아직 프론트 폴백 또는 미구현 상태입니다.

## CI

- `apps/frontend/**` 변경이 있는 PR에서는 frontend lint CI가 실행됩니다.
