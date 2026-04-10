## React 환경입니다

UI 컴포넌트와 페이지를 담당합니다.

폴더 내의 구조는 담당 파트가 자율적으로 결정하면 됩니다.
확인을 위해 README.md (현재) 파일에 폴더 구조를 간단히 정리해주세요.

현재 프론트엔드 실행 환경은 `npm + Vite + Node.js 22` 기준입니다.

## 개발 가이드

- lint 검사: `npm run lint`
- 자동 수정 가능한 항목 정리: `npm run lint:fix`

초기 도입 단계이므로 lint는 warning 중심으로 운영합니다.
파일/폴더 네이밍 규칙과 import 순서 등 핵심 컨벤션은 유지하고,
Prettier는 우선 warning으로 안내합니다.

## CI

- `apps/frontend/**` 변경이 있는 PR에서는 frontend lint CI가 실행됩니다.
