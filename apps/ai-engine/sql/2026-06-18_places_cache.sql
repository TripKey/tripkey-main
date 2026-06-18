-- 카드 Places Text Search 전역 캐시 (AI 엔진 소유)
-- Supabase SQL Editor에서 수동 적용. Flyway/Hibernate 매핑 없음.
CREATE TABLE IF NOT EXISTS places_cache (
    cache_key        text PRIMARY KEY,
    query_normalized text NOT NULL,
    region_code      text NOT NULL DEFAULT '',
    mask_version     text NOT NULL,
    response_json    jsonb NOT NULL,
    result_count     int  NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    expires_at       timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_places_cache_expires_at ON places_cache (expires_at);
