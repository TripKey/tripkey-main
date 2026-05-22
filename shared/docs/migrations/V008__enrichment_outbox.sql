-- TripKey migration: enrichment Transactional Outbox 테이블 + place_cards 큐 컬럼 제거
-- Date: 2026-05-22
-- Scope: enrichment 큐를 DB 폴링(#154) -> SQS+Outbox 로 전환. outbox 가 발행 큐를 소유.
-- 적용 대상: Supabase dev/prod. 적용 방법: SQL Editor 전체 실행.
-- 동기 산출물: schema.sql / postgis-test-schema.sql / EnrichmentOutbox 엔티티 / PlaceCard 엔티티.

create table if not exists public.enrichment_outbox (
  id              bigserial   primary key,
  trip_id         uuid        not null,
  instance_id     uuid        not null,
  payload         jsonb       not null,
  status          text        not null default 'pending',
  attempts        integer     not null default 0,
  created_at      timestamptz not null default now(),
  published_at    timestamptz,
  next_attempt_at timestamptz not null default now()
);

create index if not exists idx_enrichment_outbox_pending
  on public.enrichment_outbox (created_at) where status = 'pending';

drop index if exists public.idx_place_cards_enrichment_pending;
alter table public.place_cards drop column if exists enrichment_attempts;
alter table public.place_cards drop column if exists enrichment_claimed_at;
