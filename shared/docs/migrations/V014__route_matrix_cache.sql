-- TripKey migration: route_matrix_cache (#274)
-- Date: 2026-06-26
-- Scope: SCR-04 동선 최적화(#270)의 이동시간 행렬 캐시.
--        verify 의 route_legs_cache(best-mode) 와 메트릭이 달라(여기는 DRIVE) 분리한다.
--
-- 적용 대상: Supabase (dev / staging / production)
-- 적용 방법: Supabase SQL Editor 에서 본 파일 전체 실행
-- 동기 산출물: shared/docs/schema.sql 에 본 테이블 반영
--
-- 키: pair_key = sha1("round(o_lat),round(o_lng),round(d_lat),round(d_lng),mode") (좌표 5자리 반올림)
--     PostgREST upsert(Prefer: resolution=merge-duplicates) 충돌 대상이 되도록 PK 로 둔다.

create table if not exists public.route_matrix_cache (
  pair_key         text        primary key,
  origin_lat       double precision not null,
  origin_lng       double precision not null,
  dest_lat         double precision not null,
  dest_lng         double precision not null,
  mode             text        not null default 'driving',
  duration_seconds integer     not null,
  distance_meters  integer,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null
);

-- 만료 정리/조회용
create index if not exists idx_route_matrix_cache_expires
  on public.route_matrix_cache (expires_at);

-- ─────────────────────────────────────────────
-- 검증 (적용 후 Supabase SQL Editor)
-- ─────────────────────────────────────────────
-- select column_name, data_type from information_schema.columns
-- where table_name = 'route_matrix_cache' order by ordinal_position;
