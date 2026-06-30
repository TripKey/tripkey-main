## TripKey AI Engine

Python 3.11 / FastAPI 기반의 AI Engine입니다. 덤프 텍스트 파싱, 카드 단위 파싱, Places enrichment, 목적지 검색, route leg 계산을 담당합니다.

## 주요 기능

- Core Parse: 여행 덤프 텍스트를 카드와 alert로 변환
- Card Parse: 카드 notes 기반의 card-level 파싱
- Non-blocking Enrichment: 카드별 후처리와 alert 생성
- Destination Search: Google Places Autocomplete 기반 목적지 검색
- Route: Google Routes API 또는 추정 fallback 기반 구간 이동 정보 계산
- Places Cache: Supabase 기반 장소 검색 캐시

## 개발 가이드

- 의존성 설치: `pip install -r requirements.txt`
- 로컬 실행: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- 테스트: `pytest`
- Health: `http://localhost:8000/health`

## 환경변수

`.env.example`을 `.env`로 복사해 사용합니다.

- `GEMINI_API_KEY`
- `GEMINI_COOLDOWN_SECONDS`
- `GOOGLE_MAPS_API_KEY`
- `AI_ENGINE_WORKERS`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PLACES_CACHE_ENABLED`
- `PLACES_CACHE_TTL_POSITIVE_DAYS`
- `PLACES_CACHE_TTL_NEGATIVE_HOURS`
- `PLACES_CACHE_READ_TIMEOUT`
- `PLACES_CACHE_WRITE_TIMEOUT`

## 내부 API

- `POST /internal/ai/parse`
- `POST /internal/ai/parse/card`
- `POST /internal/ai/enrich/non-blocking/card`
- `POST /internal/ai/route`
- `POST /internal/ai/destinations/search`
