-- TripKey migration: dump_jobs 숙박 구조화 입력 컬럼
-- Date: 2026-06-01
-- Scope: /trips/{tripId}/dump 가 accommodation_inputs(구조화 숙박 리스트)를 받아 비동기 처리 시
--        AiParseRequest 로 전달하기 위해 DumpJob 에 jsonb 로 영속화한다.
-- 선례: V008__dump_jobs_flight_inputs.sql (항공편 — 단일 객체 ×2, 본 작업은 리스트).
-- 적용 대상: Supabase (단일 인스턴스). 적용 방법: SQL Editor 전체 실행 (멱등).
-- 동기 산출물: schema.sql / postgis-test-schema.sql / DumpJob 엔티티.

alter table public.dump_jobs
  add column if not exists accommodation_inputs jsonb;
