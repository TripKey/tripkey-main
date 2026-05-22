-- TripKey migration: place_cards enrichment 작업 큐 컬럼 + alert_cards 멱등 제약
-- Date: 2026-05-22
-- Scope: Non-blocking enrichment 을 in-memory 풀 → place_cards 기반 DB 작업 큐로 전환.
--        place_cards.processing_status='pending' 인 카드 = 처리 대기 enrichment 작업.
--
-- 적용 대상: Supabase (dev / production 모두)
-- 적용 방법: Supabase SQL Editor 에서 본 파일 전체 실행
-- 동기 산출물:
--   - shared/docs/schema.sql 가 본 마이그레이션 적용 후 상태와 일치해야 함
--   - apps/backend/src/test/resources/postgis-test-schema.sql 동일 반영
--   - apps/backend PlaceCard 엔티티에 enrichment_attempts / enrichment_claimed_at 선언
--
-- 컬럼 의미:
--   - enrichment_attempts  : AI enrichment 시도 횟수. maxAttempts 초과 시 processing_status='failed'.
--   - enrichment_claimed_at: 워커가 작업을 claim 한 시각. NULL 이면 미점유.
--                            stale 회수: processing 이면서 claimed_at 가 timeout 보다 오래되면 재claim.

alter table public.place_cards
  add column if not exists enrichment_attempts   integer     not null default 0,
  add column if not exists enrichment_claimed_at timestamptz;

-- 폴링 fast-path: pending 카드만 created_at 순으로 조회하는 partial index
create index if not exists idx_place_cards_enrichment_pending
  on public.place_cards (created_at)
  where processing_status = 'pending';

-- alert 멱등성: (trip_id, alert_id) unique. 제약 추가 전 기존 중복 정리 (id 최대값 1건만 유지).
delete from public.alert_cards a
 using public.alert_cards b
 where a.trip_id = b.trip_id
   and a.alert_id = b.alert_id
   and a.id < b.id;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'uq_alert_cards_trip_alert'
       and conrelid = 'public.alert_cards'::regclass
  ) then
    alter table public.alert_cards
      add constraint uq_alert_cards_trip_alert unique (trip_id, alert_id);
  end if;
end $$;
