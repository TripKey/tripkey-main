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
| Frontend | React, Vite |
| Backend | Java, Spring Boot |
| AI Engine | Python, FastAPI |
| LLM | Gemini 2.5 Flash |
| Maps | Google Maps API (Places, Directions) |
| Database | Supabase (PostgreSQL) |
| 배포 | AWS |
| 인프라 | Docker, docker-compose |

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
├── infra/                 # Docker, AWS 배포 설정
├── shared/                # 공통 타입 정의, 상수 등
├── .gitignore
├── LICENSE
└── README.md
```

---

## 로컬 실행

### 사전 요구사항

- Docker / Docker Compose
- Node.js 20+
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

# backend
SPRING_PROFILES_ACTIVE=dev
AI_ENGINE_URL=http://tripkey-ai-engine:8000
SUPABASE_URL=
SUPABASE_KEY=
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=

# ai-engine
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
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
- Backend: `http://localhost:8080` 접속 시 404가 보여도 서버가 떠 있으면 정상입니다.
- AI Engine: `docker compose -f docker-compose.yml -f docker-compose.dev.yml logs --tail=50 ai-engine` 또는 컨테이너 내부에서 `/health`로 확인할 수 있습니다.

---

## 주요 문서

| 문서 | 위치 |
|---|---|
| 기여 가이드 | `CONTRIBUTING.md` |
| 인프라 문서 | `infra/README.md` |
| 공유 리소스 문서 | `shared/README.md` |

---
