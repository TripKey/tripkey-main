-- TripKey migration: alert_cards table
-- Date: 2026-05-11
-- Scope: AI 엔진 (Core Parse / Non-blocking Enrichment) 이 생성하는 AlertCard 를
--        영속화하여 `GET /trips/{trip_id}/cards` 응답에 노출 가능하게 한다.
--        Issue #129.
--
-- 적용 대상: Supabase (dev / production 모두)
-- 적용 방법: Supabase SQL Editor 에서 본 파일 전체 실행
-- 동기 산출물:
--   - shared/docs/schema.sql 가 본 마이그레이션 적용 후 상태와 일치해야 함
--   - apps/backend/src/test/resources/postgis-test-schema.sql 동일 반영
--
-- 컬럼 의미:
--   - id                   : bigserial PK (BE 내부 식별자)
--   - trip_id              : 소속 여행 세션 FK
--   - job_id               : 생성 시점의 dump_jobs FK (nullable — 후속 enrichment 단계
--                            에서 추가될 알림은 원본 job 추적 못할 수 있음)
--   - alert_id             : AI 엔진이 부여한 외부 노출 식별자 (AlertCard.id)
--   - type                 : 자유 문자열 (timing_conflict, festival 등)
--   - category             : practical | insight
--   - scope                : trip | day (현재 trip 만 사용)
--   - day                  : scope=day 일 때만, 현재 항상 NULL
--   - message              : 알림 본문
--   - related_instance_ids : 관련 카드 instance_id 목록을 CSV 로 직렬화
--                            (기존 options/tags 컨벤션과 일관)

create table if not exists public.alert_cards (
  id                    bigserial   primary key,
  trip_id               uuid        not null references public.trips(trip_id),
  job_id                uuid        references public.dump_jobs(job_id),
  alert_id              text        not null,
  type                  text        not null,
  category              text        not null,
  scope                 text        not null default 'trip',
  day                   smallint,
  message               text        not null,
  related_instance_ids  text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_alert_cards_trip_id on public.alert_cards (trip_id);

-- ─────────────────────────────────────────────
-- 검증 (적용 후 Supabase SQL Editor 에서 실행하여 확인)
-- ─────────────────────────────────────────────
-- 1) 테이블 생성 확인
--    select column_name, data_type, is_nullable, column_default
--      from information_schema.columns
--     where table_name = 'alert_cards'
--     order by ordinal_position;
--
-- 2) 인덱스 확인
--    select indexname, indexdef
--      from pg_indexes
--     where tablename = 'alert_cards';
--
-- 3) FK 확인
--    select tc.constraint_name, kcu.column_name,
--           ccu.table_name as referenced_table,
--           ccu.column_name as referenced_column
--      from information_schema.table_constraints tc
--      join information_schema.key_column_usage kcu
--        on tc.constraint_name = kcu.constraint_name
--      join information_schema.constraint_column_usage ccu
--        on ccu.constraint_name = tc.constraint_name
--     where tc.table_name = 'alert_cards'
--       and tc.constraint_type = 'FOREIGN KEY';
