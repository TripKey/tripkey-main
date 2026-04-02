# Contributing to TripKey

TripKey 프로젝트에 기여하기 전에 이 문서를 먼저 읽어주세요.

---

## 브랜치 전략

`main` ← `develop` ← `{type}/#{issue}-{work}`

- `main`: 배포 브랜치. 직접 push 금지
- `develop`: 개발 통합 브랜치. PR을 통해서만 merge
- 작업 브랜치: `develop`에서 분기

```bash
git checkout develop
git checkout -b feat/hyobeen/#12-login
```

브랜치 `type`은 커밋 컨벤션과 동일하게 사용합니다.

---

## 커밋 컨벤션

```text
<type>: <subject>
```

예시:

```text
feat: 여행 일정 생성 API 추가
fix: 로그인 토큰 만료 오류 수정
chore: docker compose 개발 환경 정리
docs: 로컬 실행 가이드 업데이트
```

| type | 설명 |
|---|---|
| feat | 새로운 기능 |
| fix | 버그 수정 |
| chore | 설정, 패키지 변경 |
| docs | 문서 수정 |
| style | 코드 포맷 (로직 변경 없음) |
| refactor | 리팩토링 |
| test | 테스트 추가/수정 |

---

## 이슈 규칙

- 작업 시작 전 이슈를 먼저 생성합니다.
- 라벨은 `type` + `area` 조합으로 지정합니다.
- 예시: `type: feat` + `area: backend`
- Assignee는 작업자 본인으로 지정합니다.

---

## PR 규칙

- PR 제목은 커밋 컨벤션과 동일한 형식을 사용합니다.
- PR 본문에 `Closes #이슈번호`를 반드시 포함합니다.
- 최소 1명 이상 리뷰 승인 후 merge 합니다.
- PR 템플릿은 `.github/PULL_REQUEST_TEMPLATE.md`를 사용합니다.
- PR 범위는 하나의 기능 또는 하나의 목적 단위로 잘라주세요.

기본 체크 항목:

```markdown
## 작업 내용
<!-- 변경사항 간단히 설명 -->

## 관련 이슈
Closes #

## 변경 범위
- [ ] Frontend
- [ ] Backend
- [ ] AI Engine
- [ ] 공통 / 설정 / 문서

## 체크리스트
- [ ] 로컬에서 정상 동작 확인
- [ ] 기존 기능이 깨지지 않았나요?
- [ ] PR 범위가 하나의 기능 단위로 잘 잘려 있나요?
```

---

## 프로젝트 구조

```text
tripkey-main/
├── apps/
│   ├── frontend/     # React + Vite
│   ├── backend/      # Spring Boot
│   └── ai-engine/    # Python / FastAPI
├── infra/
├── shared/
├── CONTRIBUTING.md
└── README.md
```

---

## 로컬 개발 환경

### 사전 요구사항

- Docker / Docker Compose
- Node.js 20+
- Java 21+
- Python 3.11+

### 환경변수 설정

각 앱 디렉토리의 `.env.example`을 복사해 `.env` 파일을 만듭니다.

```bash
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
cp apps/ai-engine/.env.example apps/ai-engine/.env
```

### 전체 서비스 실행

```bash
docker compose up --build
```

### 개별 서비스 실행

```bash
docker compose up frontend
docker compose up backend
docker compose up ai-engine
```

### 개별 앱 로컬 실행

```bash
cd apps/frontend && npm install && npm run dev
cd apps/backend && ./gradlew bootRun
cd apps/ai-engine && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 동작 확인

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8080` 접속 시 404가 보여도 서버가 떠 있으면 정상입니다.
- AI Engine: `docker compose logs --tail=50 ai-engine` 또는 컨테이너 내부 `/health`로 확인합니다.

---
