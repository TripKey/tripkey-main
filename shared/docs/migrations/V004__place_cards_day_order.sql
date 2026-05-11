-- TripKey migration: place_cards.day_order column
-- Date: 2026-05-11
-- Scope: SCR-04V verify / SCR-05 confirm 의 배치 데이터(`PlacementSaveRequest.PlacementDayItem.order`)
--        를 영속화할 컬럼을 추가한다.
--
-- 적용 대상: Supabase (dev / production 모두)
-- 적용 방법: Supabase SQL Editor 에서 본 파일 전체 실행
-- 동기 산출물: shared/docs/schema.sql 가 본 마이그레이션 적용 후 상태와 일치해야 함
--
-- 의미:
-- - day_order: 같은 day 안에서 카드의 표시 순서 (1-base).
-- - day=NULL (미배치) 카드는 day_order 도 NULL.
-- - verify/confirm 시점에 BE 가 PlacementSaveRequest 의 order 값으로 갱신.
-- - 본 컬럼은 nullable — 기존 카드들은 verify/confirm 이전까지 NULL 로 유지.

alter table public.place_cards
  add column if not exists day_order smallint;

-- ─────────────────────────────────────────────
-- 검증 (적용 후 Supabase SQL Editor 에서 실행하여 확인)
-- ─────────────────────────────────────────────
-- 1) 컬럼 추가 확인
--    select column_name, data_type, is_nullable, column_default
--      from information_schema.columns
--     where table_name = 'place_cards' and column_name = 'day_order';
--
-- 2) 기존 데이터 영향 확인 (모두 NULL 이어야 함)
--    select count(*) total,
--           count(*) filter (where day_order is null) null_count
--      from public.place_cards;
