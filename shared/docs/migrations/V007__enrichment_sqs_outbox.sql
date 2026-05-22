-- TripKey migration: enrichment 큐 SQS + Transactional Outbox 전환
-- Date: 2026-05-22
-- Issue: #154 (enrichment 비동기 큐) — DB 폴링 대신 AWS SQS + Outbox 채택
-- Scope: producer 가 카드 저장과 동일 트랜잭션에 enrichment_outbox 행을 적재(아웃박스),
--        relay 가 SQS 로 발행, 컨슈머가 소비. place_cards 자체엔 큐 컬럼을 두지 않는다.
-- 적용 대상: Supabase (dev / production 모두)
-- 적용 방법: Supabase SQL Editor 에서 본 파일 전체 실행 (멱등 — 재실행 안전)
-- 동기 산출물: shared/docs/schema.sql / apps/backend/src/test/resources/postgis-test-schema.sql /
--             EnrichmentOutbox 엔티티. (※ 코드 부팅 전에 적용해야 ddl-auto=validate 통과.)
--
-- 비고: 본 마이그레이션은 초안 단계의 V007(place_cards 큐 컬럼)+V008(outbox)을 하나로 합친 것이다.
--       어느 환경에도 적용된 적이 없어 "추가했다 제거"하는 두 단계를 단일 net 상태로 통합했다.

-- 1) alert 멱등성: (trip_id, alert_id) unique. 제약 추가 전 기존 중복 정리 (id 최대값 1건만 유지).
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

-- 2) enrichment Transactional Outbox (발행 대기 메시지)
create table if not exists public.enrichment_outbox (
  id              bigserial   primary key,
  trip_id         uuid        not null,
  instance_id     uuid        not null,                  -- 대상 place_card
  payload         jsonb       not null,                  -- 직렬화된 AiNonBlockingEnrichmentRequest (SQS 메시지 본문)
  status          text        not null default 'pending', -- pending | published | failed
  attempts        integer     not null default 0,         -- 발행 재시도 횟수
  created_at      timestamptz not null default now(),
  published_at    timestamptz,
  next_attempt_at timestamptz not null default now()
);

create index if not exists idx_enrichment_outbox_pending
  on public.enrichment_outbox (created_at) where status = 'pending';
