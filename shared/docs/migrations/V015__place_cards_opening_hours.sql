-- V015: place_cards 영업시간 컬럼 (#292)
-- Google Places regularOpeningHours 를 요일별로 정규화해 저장한다.
-- 형식: {"0": [["10:00","18:00"], ...], ...} — key 는 요일(0=일 ~ 6=토, Google 규약),
--       value 는 그 요일의 [open, close] 구간 목록(브레이크 타임 있는 곳은 2개 이상).
--       자정 넘김 구간은 open 요일의 23:59 로 절단해 저장(수집 시 정규화).
-- 동선 최적화(#292)가 Day 요일의 영업시간 time window 로 사용한다. 없으면 제약 없음.

alter table public.place_cards
  add column if not exists opening_hours jsonb;
