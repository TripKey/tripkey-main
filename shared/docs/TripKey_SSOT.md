# TripKey — Single Source of Truth (SSOT)

## 🧭 역할
이 문서는 TripKey 프로젝트의 Single Source of Truth입니다.  
정의되지 않은 기준은 존재하지 않는 것으로 간주합니다.

---

## 🤖 AI 행동 원칙

### 응답 방식
- 대화 금지, 문서 관리만 수행
- 항상 구조화된 형식
- 질문 시 "기준 근거" 명시
- 기준 없는 경우 → "기준 미정의"

### Export 규칙
- "export" 요청 시 전체 기준을 Markdown(.md)으로 출력
- 모든 기준 포함 필수

---

## 🔑 운영 원칙

| 원칙 | 내용 |
|------|------|
| 기준 관리 | 모든 설계는 SSOT에서만 정의 |
| 변경 관리 | 변경 시 이유 + 영향 기록 |
| 역할 분리 | 정의 vs 실행 분리 |
| 최신화 | 항상 최신 유지 |

---

## 📦 서비스 정의
자연어 여행 정보 → 장소 추출 → 그룹화 → 배치 → 동선 검증 → 확정

---

## 🔄 핵심 플로우

SCR-01 온보딩  
SCR-02 Dump  
SCR-02P 파싱  
SCR-03 그룹화  
SCR-04 배치  
SCR-04V 검증  
SCR-05 확정  

---

## 🏗 시스템 아키텍처

### 스택
- React + Vite
- Spring Boot
- FastAPI
- Supabase (PostgreSQL)

### 구조
frontend → backend → ai-engine  

- frontend → ai-engine 직접 호출 금지  
- backend가 gateway 역할 수행  

---

## 🌐 네트워크 / 프록시 구조

### Proxy
- 외부: /api/*
- 내부: /v1/*
- dev: Vite proxy
- prod: Nginx

### AI Engine
- 내부 주소: http://tripkey-ai-engine:8000
- 외부 포트 없음 (expose only)

### Docker
- frontend
  - Dockerfile (prod)
  - Dockerfile.dev (dev)
- compose
  - docker-compose.yml → dev
  - docker-compose.prod.yml → prod

---

## 📁 모노레포 구조

tripkey-main/
 ├── apps/
 │    ├── frontend (3000)
 │    ├── backend (8080)
 │    └── ai-engine (8000)
 ├── infra/
 ├── shared/
 └── docker-compose.yml

---

## 📡 API 구조

### 핵심 엔드포인트
- /trips
- /dump
- /groups
- /schedule
- /verify
- /confirm

### 설계 원칙
- Flow 기반
- 비동기 처리 (Dump + polling)
- fallback 필수

### Dump Parse 계약
- backend → ai-engine parse request:
  - `text: string`
  - `destination?: string`
  - `travel_days?: number`
  - `trip_id?: string`
- ai-engine → backend parse response:
  - `cards: PlaceCard[]`
  - `context_summary?: string`
  - `alert_cards?: AlertCard[]`
- `instance_id`는 ai-engine이 생성하지 않는다.
- `instance_id`와 `trip_id` 저장 책임은 backend가 가진다.
- `trip_id`는 세션/저장 식별자이며, ai-engine의 저장 책임을 의미하지 않는다.

---

## ⚙️ 개발 원칙

### 레이어 역할
- Backend: orchestration / DB
- AI Engine: 분석 / 계산

### Parse 계약 책임 분리
- AI Engine:
  - `place_id`
  - `name`
  - `category`
  - `classification`
  - `status`
  - `estimated_duration_min`
  - `coordinates`
  - `time_constraint`
  - `conflict_*`
  - `remind`
  - `context_summary`
  - `alert_cards`
- Backend:
  - `instance_id` 발급
  - 저장
  - 정제 후 클라이언트 응답 구성
  - fallback / 에러 응답 제어

### Fallback
- LLM 실패 → rule-based
- Maps 실패 → 예측값

### 내부 코드값 표준
- API / AI / Backend / DB 계약값은 영문 코드값을 사용한다.
- Frontend 사용자 노출 문구는 한글 라벨 매핑으로 처리한다.
- PlaceCard 기준 내부 표준값:
  - `category`: `attraction`, `shopping`, `dining`, `accommodation`, `transportation`, `uncategorized`
  - `classification`: `confirmed`, `open_question`, `undecided`, `unassigned`
  - `status`: `loading`, `success`, `error`

---

## 🧠 AI 기준
- Gemini 2.5 Flash
- FastAPI 분리 구조

---

## 🔐 세션 정책
- trip_id 기반
- TTL 24시간
- 로그인 없음

---

## 🔀 요청 흐름 모델 (중요)

### Non-AI 흐름
frontend → backend → database

### AI 흐름
frontend → backend → ai-engine → backend → database

### 규칙
- frontend는 ai-engine 직접 호출 금지
- ai-engine은 내부 통신 전용
- backend가 항상 gateway

---

## 🧩 Agent 운영 규칙 (Codex / Claude Code)

### 기본 원칙
- 기본 모드: 분석 / 계획 / 리뷰 / 변경 제안
- 명시적 요청 없이 코드 수정 금지
- 구조/API/정책 변경 감지 시:
  → `[SSOT CHANGE CANDIDATE]`로 보고 후 중단

### MD 수정 금지
- .md 파일은 사용자 허락 없이 수정 금지
- 수정 필요 시 아래 형식으로 요청

```text
[MD 수정 허락 요청]
파일:
수정 내용:
수정 이유:
→ 수정해도 될까요?
```

---

## 📄 Review 문서 구조

경로:
shared/docs/agent/review/

파일:
- core-review.md
- backend-review.md
- frontend-review.md
- ai-engine-review.md

---

## 🔍 Cross-layer Review 규칙

- multi-layer 변경 시 관련 review 문서 함께 검토

기본 조합:
- ai-engine ↔ backend
- frontend ↔ backend
- 전체 플로우 → core + 전체
- infra → core + 영향 레이어

---

## 🧪 Agent 프롬프트 세트

경로:
- shared/docs/agent/codex/codex-prompts.md (Codex)
- shared/docs/agent/claude/claude-prompts.md (Claude Code)

- 계획만 먼저
- 변경안만 제시
- 승인 후 구현
- backend 리뷰
- frontend 리뷰
- ai-engine 리뷰
- ai-engine ↔ backend 크로스 레이어 리뷰
- frontend ↔ backend 크로스 레이어 리뷰
- 전체 리뷰
- SSOT 드리프트 체크
- 2단계 운영
- 리뷰 후 구현

(모든 프롬프트는 md 수정 금지 규칙 포함)

---

## 🌍 Language 규칙

- 사용자 응답: 한국어
- 코드 / 주석 / docstring: 영어
- identifier / API / log / path: 번역 금지

---

## 📊 데이터 흐름

Dump:
frontend → backend → ai → polling  

Dump Parse:
backend → ai-engine 호출 시 `text`, `destination`, `travel_days`를 전달한다.
ai-engine은 raw response를 normalization한 뒤 schema validation을 통과한 결과만 backend에 반환한다.
backend는 ai-engine response를 그대로 신뢰하지 않고, 저장 직전에 도메인 규칙으로 한 번 더 normalization한다.

Schedule:
drag & drop → PATCH → DB  

Verify:
Maps API → fallback  

---

## 🔐 Dependency Update 정책

### Dependabot 운영 원칙
- 기본 운영은 `security-only`
- 일반 version update PR은 받지 않는다.
- 보안 취약점이 있는 dependency에 대해서만 PR을 생성한다.
- auto-merge는 사용하지 않는다.
- security PR은 CI 통과 후 사람이 확인하고 머지한다.

### Dependabot 설정 원칙
- `open-pull-requests-limit: 0`을 사용해 version updates를 비활성화한다.
- security updates는 ecosystem별로 그룹화할 수 있다.
- semver major 보안 업데이트도 차단하지 않는다.
- default branch 기준으로 security updates가 생성되도록 운영한다.

### 현재 적용 대상
- frontend npm
- backend gradle
- ai-engine pip
- github-actions
- docker

---

## 📌 기능

온보딩 / 파싱 / 그룹화 / 배치 / 검증 / 확정

---

## 📈 KPI

- 전환율 ≥ 70%
- AI 수정률 ≤ 15%
- 시간 50% 단축

---

## 📎 기준 문서

- API 명세서
- 시스템 설계
- PRD
- 기능 명세서
- TripKey_SSOT.md → shared/docs/agent/TripKey_SSOT.md

---

## 🔄 변경 관리

[변경 유형]  
[변경 내용]  
[변경 이유]  
[영향 범위]  
[변경일]  

---

## 📌 현재 상태

- 모노레포 완료
- Backend: 구조만 존재
- AI Engine: parse schema / normalization 초안 반영
- Frontend: 초기 상태

---

※ Living Document  
최종 변경: 2026-04-13
