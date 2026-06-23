-- 카드 Places Text Search accepted-place 캐시 (AI 엔진 소유)
-- Supabase SQL Editor에서 수동 적용. Flyway/Hibernate 매핑 없음.
-- 기존 response_json/result_count 기반 캐시가 이미 있으면 안전 변환이 어렵다.
-- 캐시는 재생성 가능한 데이터이므로 테이블을 비우고 새 스키마로 다시 시작한다.
DROP TABLE IF EXISTS places_cache;

CREATE TABLE IF NOT EXISTS places_cache (
    cache_key        text PRIMARY KEY,
    query_normalized text NOT NULL,
    region_code      text NOT NULL DEFAULT '',
    mask_version     text NOT NULL,
    place_json       jsonb,
    is_negative      boolean NOT NULL DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now(),
    expires_at       timestamptz NOT NULL,
    CONSTRAINT chk_places_cache_payload
        CHECK ((is_negative = true AND place_json IS NULL) OR (is_negative = false AND place_json IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_places_cache_expires_at ON places_cache (expires_at);
