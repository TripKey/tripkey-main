-- TripKey migration: PostGIS foundation
-- Date: 2026-05-04
-- Scope: place_cards 공간 컬럼/인덱스 추가 (SCR-04 거리 클러스터링 / SCR-04V 동선 검증 기반)
--
-- 적용 대상: Supabase (dev / production 모두)
-- 적용 방법: Supabase SQL Editor 에서 본 파일 전체 실행
-- 동기 산출물: shared/docs/schema.sql, shared/docs/ERD.md 가 본 마이그레이션 적용 후 상태와 일치해야 함

-- 1. PostGIS 확장 활성화
create extension if not exists postgis;

-- 2. place_cards.geom 컬럼 추가 (lat/lng 기반 generated column)
--    - lat/lng 가 변경되면 DB가 자동으로 geom 을 갱신.
--    - lat/lng 둘 중 하나라도 NULL 이면 geom 도 NULL.
--    - SRID 4326 = WGS84 (위경도).
--    - 미터 단위 거리/반경 쿼리는 geom::geography 캐스트 또는 ST_DistanceSphere 사용.
alter table public.place_cards
  add column if not exists geom geometry(Point, 4326)
    generated always as (
      case
        when lat is not null and lng is not null
          then st_setsrid(st_makepoint(lng, lat), 4326)
        else null
      end
    ) stored;

-- 3. GiST 공간 인덱스
--    반경 검색 (ST_DWithin), 클러스터링 (ST_ClusterDBSCAN), KNN (<->) 등에서 사용.
create index if not exists idx_place_cards_geom
  on public.place_cards using gist (geom);

-- ─────────────────────────────────────────────
-- 검증 (적용 후 Supabase SQL Editor 에서 실행하여 확인)
-- ─────────────────────────────────────────────
-- 1) PostGIS 확장 설치 확인
--    select extname, extversion from pg_extension where extname = 'postgis';
--
-- 2) geom 컬럼/인덱스 확인
--    select column_name, data_type, is_generated, generation_expression
--    from information_schema.columns
--    where table_name = 'place_cards' and column_name = 'geom';
--
--    select indexname from pg_indexes
--    where tablename = 'place_cards' and indexname = 'idx_place_cards_geom';
--
-- 3) lat/lng 와 geom 동기화 확인 (기존 데이터)
--    select instance_id, lat, lng, st_y(geom) as geom_lat, st_x(geom) as geom_lng
--    from public.place_cards
--    where lat is not null and lng is not null
--    limit 5;
--
-- 4) 미터 단위 거리 계산 동작 확인 (도쿄 신주쿠역 기준 가까운 카드)
--    select instance_id, name, location,
--           st_distancesphere(geom, st_setsrid(st_makepoint(139.7006, 35.6896), 4326)) as dist_m
--    from public.place_cards
--    where geom is not null
--    order by dist_m
--    limit 5;
