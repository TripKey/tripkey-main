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

- Docker / docker-compose
- Node.js 20+
- Java 17+
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
# backend / ai-engine 공통
SUPABASE_URL=
SUPABASE_KEY=

# ai-engine
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
```

### 실행

```bash
# 전체 실행 (권장)
docker-compose up

# 개별 실행
cd apps/frontend && npm install && npm run dev     # http://localhost:5173
cd apps/backend && ./gradlew bootRun               # http://localhost:8080
cd apps/ai-engine && uvicorn main:app --reload     # http://localhost:8000
```

---

## 브랜치 전략

```
main                              ← 배포용. 직접 푸시 금지
develop                           ← 통합 브랜치. PR로만 머지
{type}/{이름}/#{이슈번호}-{기능명}     ← 작업 브랜치
```
브랜치 타입은 커밋 컨벤션과 동일하게 맞춥니다.
---

## 커밋 컨벤션

```
feat:      새로운 기능
fix:       버그 수정
chore:     설정, 패키지 변경
docs:      문서 수정
style:     코드 포맷 (로직 변경 없음)
refactor:  리팩토링
test:      테스트 추가/수정
```

**예시**

```
feat: Dump 입력 화면 구현 (SCR-02)
fix: PlaceCard 상태 전환 오류 수정
docs: API 명세서 엔드포인트 업데이트
```

---

## PR 규칙

- `feature/*` → `develop` PR 후 머지
- 셀프 머지 금지. 최소 1명 리뷰 후 머지
- PR 템플릿 필수 작성 (`.github/PULL_REQUEST_TEMPLATE.md`)
- PR 단위는 하나의 기능 범위로 잘라주세요

---

## 주요 문서

| 문서 | 위치 |
|---|---|
| Lean PRD | `docs/TripKey_Lean_PRD_v1.1.md` |
| 기능명세서 | `docs/TripKey_기능명세서_v1.0.xlsx` |
| API 명세서 | `docs/openapi.yaml` |
| 시스템 아키텍처 | `docs/TripKey_SystemArchitecture_v1.2.md` |

---