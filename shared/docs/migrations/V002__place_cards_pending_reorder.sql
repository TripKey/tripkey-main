-- TripKey migration: place_cards.pending_reorder column
-- Date: 2026-05-06
-- Scope: SCR-04 Stock 그룹 재정렬 트리거(POST /trips/{trip_id}/groups/reorder) 의 정확한 의미를
--        지원하기 위한 카드별 "재정렬 대기 중" 플래그를 추가한다.
--
-- 적용 대상: Supabase (dev / production 모두)
-- 적용 방법: Supabase SQL Editor 에서 본 파일 전체 실행
-- 동기 산출물: shared/docs/schema.sql 가 본 마이그레이션 적용 후 상태와 일치해야 함
--
-- 정책:
-- - 컬럼 default = true (새로 만들어진 카드는 일단 pending_reorder 그룹에 들어감)
-- - AI 파싱(SCR-02) 으로 만들어진 기존 카드들은 사용자가 명시적으로 재정렬을 누른 적 없지만
--   대량 일괄 추가된 결과이므로 false 로 백필하여 첫 SCR-04 진입 시 즉시 클러스터링되게 한다.
-- - SCR-04 진입 후 새로 추가되는 카드 (POST /cards) 는 default true 를 그대로 둬 pending_reorder 에
--   머무르고, 사용자가 "재정렬" 버튼을 눌러야 available 클러스터로 편입된다.

-- 1. pending_reorder 컬럼 추가 (default true, NOT NULL)
alter table public.place_cards
  add column if not exists pending_reorder boolean not null default true;

-- 2. 기존 AI 파싱 카드 백필 — 첫 SCR-04 진입에서 즉시 클러스터에 포함되도록
update public.place_cards
   set pending_reorder = false
 where source = 'ai_parse';

-- ─────────────────────────────────────────────
-- 검증 (적용 후 Supabase SQL Editor 에서 실행하여 확인)
-- ─────────────────────────────────────────────
-- 1) 컬럼 추가 확인
--    select column_name, data_type, is_nullable, column_default
--      from information_schema.columns
--     where table_name = 'place_cards' and column_name = 'pending_reorder';
--
-- 2) 백필 결과 확인 (source 별 분포)
--    select source, pending_reorder, count(*)
--      from public.place_cards
--     group by source, pending_reorder
--     order by source, pending_reorder;
