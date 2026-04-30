# TripKey Production Compose Runbook

## Scope

This runbook targets a single-host Docker Compose deployment, such as an AWS EC2
instance. Supabase is used as the managed PostgreSQL database.

## Prerequisites

- Docker and Docker Compose are installed on the host.
- Supabase schema is already applied.
- Required env files are present on the host:
  - `apps/backend/.env`
  - `apps/ai-engine/.env`

Do not commit real env files or secrets.

## Required Backend Env

```env
SPRING_PROFILES_ACTIVE=prod
SUPABASE_DB_URL=
SUPABASE_DB_USERNAME=
SUPABASE_DB_PASSWORD=
AI_ENGINE_URL=http://tripkey-ai-engine:8000
AI_ENGINE_TIMEOUT_SECONDS=90
```

## Required AI Engine Env

```env
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
AI_ENGINE_WORKERS=2
```

## Start

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Only the frontend container publishes a host port by default:

- `frontend`: `80:80`
- `backend`: internal Docker network only
- `ai-engine`: internal Docker network only

The frontend nginx container proxies `/api/*` to `backend:8080/v1/*`.

## Logs

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

Service-specific logs:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f ai-engine
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f frontend
```

## Stop

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
```

## Smoke Test

From the host:

```bash
curl http://localhost/
```

Through the frontend proxy:

```bash
curl 'http://localhost/api/trips/destinations/search?q=도쿄'
```

If the API request fails, inspect backend and frontend logs first.
