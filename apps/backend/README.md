## TripKey Backend

Java 21 / Spring Boot 3.5 기반의 TripKey API 서버입니다. 여행 생성, 덤프 파싱 작업 관리, 카드 상태 관리, 03/04 그룹 뷰, Day 배치, verify/confirm, route leg cache, alert persistence를 담당합니다.

## 주요 기술

- Java 21 toolchain
- Spring Boot 3.5
- Spring MVC / Validation
- Spring Data JPA + Hibernate Spatial
- PostgreSQL / PostGIS
- Spring WebClient
- Spring Cloud AWS SQS
- springdoc OpenAPI
- Testcontainers / LocalStack

## 개발 가이드

- 테스트: `./gradlew test`
- 로컬 실행: `./gradlew bootRun`
- Docker Compose 실행은 루트 README의 dev compose 명령을 사용합니다.

서버 context path는 `/v1`입니다.

- Health: `http://localhost:8080/v1/health`
- OpenAPI JSON: `http://localhost:8080/v1/api-docs`
- Swagger UI: `http://localhost:8080/v1/swagger-ui.html`

## 환경변수

`.env.example`을 `.env`로 복사해 사용합니다.

- `SPRING_PROFILES_ACTIVE`: dev/prod profile
- `AI_ENGINE_URL`: FastAPI AI Engine base URL
- `AI_ENGINE_TIMEOUT_SECONDS`: AI Engine HTTP timeout
- `SUPABASE_DB_URL`, `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD`: PostgreSQL 연결
- `SUPABASE_URL`, `SUPABASE_KEY`: Supabase API/Auth 연동용
- `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`: 외부 API 키

## 주요 API

- `GET /health`
- `GET /trips/destinations/search`
- `POST /trips`
- `GET /trips/{tripId}`
- `POST /trips/{tripId}/dump`
- `GET /trips/{tripId}/parse/jobs/{jobId}/status`
- `GET /trips/{tripId}/cards`
- `POST /trips/{tripId}/cards`
- `PATCH /trips/{tripId}/cards/{instanceId}`
- `GET /trips/{tripId}/groups?view=03|04`
- `POST /trips/{tripId}/groups/reorder`
- `GET /trips/{tripId}/days/{dayNumber}`
- `POST /trips/{tripId}/verify`
- `POST /trips/{tripId}/confirm`
- `GET /trips/{tripId}/confirm-summary`
- `GET /trips/{tripId}/route-legs`

프론트 dev server는 `/api/*`를 이 서버의 `/v1/*`로 rewrite합니다.
