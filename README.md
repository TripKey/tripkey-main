# tripkey-main
✈️ TripKey: Unlock Your Travel Flow "흩어진 여행의 조각들을 하나의 완벽한 동선으로"

## 프로젝트 소개

사람들은 인스타그램, 유튜브, 블로그에서 여행 정보를 충분히 모읍니다.  
문제는 그 이후 — 흩어진 정보를 날짜와 동선이 있는 일정으로 바꾸는 과정이 또 하나의 노동입니다.

TripKey는 이 단절을 없앱니다.  
모아둔 정보를 텍스트로 붙여 넣으면 AI가 장소를 추출하고, 지역별로 묶고, 동선 초안까지 잡아줍니다.  
사용자는 80% 초안 위에서 드래그앤드롭으로 직접 완성합니다.

---

## 기술 스택

| 레이어 | 기술 |
|---|---|
| Frontend | React 19, Vite, React Router, React Query |
| Backend | Java 21, Spring Boot 3.5, Spring Data JPA |
| AI Engine | Python 3.11, FastAPI |
| LLM | Gemini 2.5 Flash |
| Maps | Google Maps API (Places, Routes/Directions) |
| Database | Supabase PostgreSQL + PostGIS |
| Queue | AWS SQS / LocalStack(dev) |
| 배포 | AWS, Docker, Kubernetes manifests |
| 인프라 | Docker Compose, nginx, k8s |

---

## 레포 구조

```
tripkey-main/
├── .github/
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
├── apps/
│   ├── frontend/          # React + Vite
│   ├── backend/           # Java Spring Boot
│   └── ai-engine/         # Python FastAPI
├── infra/                 # 배포 스크립트, Docker, k8s 설정
├── shared/                # DB schema/migration, 제품/기술 문서
├── .gitignore
├── LICENSE
└── README.md
```

---

## 로컬 실행

### 사전 요구사항

- Docker / Docker Compose
- Node.js 22+ (frontend README 기준)
- Java 21+
- Python 3.11+

### 환경변수 설정

각 앱 디렉토리의 `.env.example`을 복사해 `.env`로 만들고 값을 채워주세요.

```bash
cp apps/frontend/.env.example apps/frontend/.env
cp apps/backend/.env.example apps/backend/.env
cp apps/ai-engine/.env.example apps/ai-engine/.env
```

필요한 키 목록:

```
# frontend
VITE_API_BASE_URL=/api
VITE_DEV_PROXY_TARGET=http://localhost:8080
VITE_GOOGLE_MAPS_API_KEY=

# backend
SPRING_PROFILES_ACTIVE=dev
AI_ENGINE_URL=http://tripkey-ai-engine:8000
AI_ENGINE_TIMEOUT_SECONDS=90
SUPABASE_DB_URL=
SUPABASE_DB_USERNAME=
SUPABASE_DB_PASSWORD=
SUPABASE_URL=
SUPABASE_KEY=
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=

# ai-engine
GEMINI_API_KEY=
GEMINI_COOLDOWN_SECONDS=60
GOOGLE_MAPS_API_KEY=
AI_ENGINE_WORKERS=2
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
PLACES_CACHE_ENABLED=true
```

### 실행

```bash
# 전체 실행 (권장)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# 개별 실행
cd apps/frontend && npm install && npm run dev     # http://localhost:3000
cd apps/backend && ./gradlew bootRun               # http://localhost:8080
cd apps/ai-engine && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 확인 방법

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:8080/v1/health`
- Backend OpenAPI: `http://localhost:8080/v1/api-docs`, Swagger UI: `http://localhost:8080/v1/swagger-ui.html`
- AI Engine health: `http://localhost:8000/health`

---

## 현재 주요 플로우

- `/onboarding`: 여행 생성, 목적지 검색
- `/dump`: 여행 정보 덤프 입력 및 비동기 파싱 시작
- `/grouping`: 카드 정리, 카드 추가/수정, action type 기반 검토
- `/arrange`: Day 배치, 그룹 재정렬, 동선 검증
- `/confirm`: 최종 확인 화면. 일정/카드/alert는 실데이터 기반이며 일부 요약/체크리스트/저장 공유는 아직 프론트 폴백입니다.

주요 API는 백엔드 context path `/v1` 아래에 있습니다. 프론트 dev server는 `/api` 요청을 `/v1`로 rewrite해 백엔드에 프록시합니다.

---

## 주요 문서

| 문서 | 위치 |
|---|---|
| 기여 가이드 | `CONTRIBUTING.md` |
| 인프라 문서 | `infra/README.md` |
| 공유 리소스 문서 | `shared/README.md` |

---
