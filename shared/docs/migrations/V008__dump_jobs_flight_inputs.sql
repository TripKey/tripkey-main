-- TripKey migration: dump_jobs 항공편 구조화 입력 컬럼
-- Date: 2026-05-27
-- Scope: /trips/{tripId}/dump 가 departure_flight/return_flight(구조화)를 받아 비동기 처리 시
--        AiParseRequest 로 전달하기 위해 DumpJob 에 jsonb 로 영속화한다.
-- 적용 대상: Supabase (단일 인스턴스). 적용 방법: SQL Editor 전체 실행 (멱등).
-- 동기 산출물: schema.sql / postgis-test-schema.sql / DumpJob 엔티티.

alter table public.dump_jobs
  add column if not exists departure_flight jsonb,
  add column if not exists return_flight    jsonb;
