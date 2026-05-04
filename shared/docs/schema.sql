-- TripKey v3.2 schema
-- Scope: SCR-02P까지 도입된 Card SSOT 모델의 완전한 스키마.
--        notes / memo / day 컬럼은 SCR-03/04/05에서 채워짐 (이 시점엔 NULL).
-- Source of truth: Supabase. 이 파일은 Supabase 실제 스키마를 미러링합니다.
-- 의존 확장: postgis (place_cards.geom 컬럼 / GiST 인덱스에서 사용)

-- 여행 세션 (SCR-01 온보딩에서 생성)
create table if not exists public.trips (
  trip_id            uuid        primary key,                     -- 여행 세션 고유 ID
  travel_days        smallint    not null,                        -- 여행 일수
  companion_count    smallint    not null,                        -- 동행 인원 (1 = 혼자)
  has_flight         boolean,                                     -- 항공권 보유 여부 (온보딩 응답)
  has_accommodation  boolean,                                     -- 숙소 보유 여부 (온보딩 응답)
  confirmed_at       timestamptz,                                 -- 일정 확정 시각 (SCR-05)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- 여행지 목록 (SCR-01 온보딩에서 저장)
create table if not exists public.trip_destinations (
  id          bigserial   primary key,
  trip_id     uuid        not null references public.trips(trip_id),
  name        text        not null,                                -- 여행지명
  sort_order  smallint    not null default 0                       -- 정렬 순서
);

-- Dump 파싱 작업 (SCR-02 텍스트 제출 시 생성, SCR-02P에서 상태 폴링)
create table if not exists public.dump_jobs (
  job_id          uuid        primary key,                         -- 파싱 작업 고유 ID
  trip_id         uuid        not null references public.trips(trip_id), -- 소속 여행 세션
  dump_text       text        not null,                            -- 사용자가 입력한 자유 텍스트
  status          text        not null,                            -- 작업 상태: pending / processing / completed / failed
  step            smallint,                                        -- 파싱 진행 단계 (1~3), null이면 미시작
  error_code      text,                                            -- 실패 시 오류 코드: PARSE_FAILED / NO_PLACES_FOUND
  context_summary text,                                            -- AI가 파악한 여행 스타일 요약
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_dump_jobs_trip_id on public.dump_jobs (trip_id);

-- 장소 카드 (Card SSOT, AI 파싱 결과로 생성)
create table if not exists public.place_cards (
  instance_id            uuid        primary key,                  -- 카드 인스턴스 ID (중복 배치 허용)
  trip_id                uuid        not null references public.trips(trip_id), -- 소속 여행 세션
  place_id               text,                                     -- Google Places place_id (Blocking Enrichment에서 보강)
  status                 text,                                     -- 카드 레거시/보조 상태 (NULL 허용)
  name                   text        not null,                     -- 장소명
  category               text        not null,                     -- 카테고리: place / activity / transport / accommodation / food / etc

  -- 4 상태 축
  classification         text        not null,                     -- 사용자 의도 확정성: confirmed / open_question / undecided / unassigned
  placement_status       text        not null default 'ready_partial', -- 배치 가능성: ready / ready_partial / needs_input / blocked
  processing_status      text        not null default 'completed', -- 비동기 처리: completed / pending / processing / failed
  action_type            text        not null default 'review_only', -- FE 행동 유도: review_only / input_required / select_required / fix_required

  -- 정책 플래그
  can_exclude            boolean     not null default true,        -- 카드 제외 가능 여부 (BE 결정)
  allow_duplicate        boolean     not null default false,       -- Day 보드 중복 배치 허용 (숙소/교통은 true 기본)
  is_excluded            boolean     not null default false,       -- 사용자가 제외한 카드 여부
  is_ai_generated        boolean     not null,                     -- AI가 자체적으로 추가한 추천 카드 여부 (INSERT 시 명시 필요)

  -- 위치 / 메타
  estimated_duration_min smallint,                                 -- 예상 체류시간 (분)
  lat                    double precision,                         -- 위도
  lng                    double precision,                         -- 경도
  location               text,                                     -- 지역명/주소 요약
  address                text,                                     -- 상세 주소 (Blocking Enrichment 보강)
  time_constraint        text,                                     -- 시간 제약 설명

  -- 사용자/AI 컨텍스트
  user_context           text,                                     -- 사용자 맥락 반영 문구
  tips                   text,                                     -- AI 방문 팁/경고
  question_text          text,                                     -- undecided 카드의 질문 텍스트
  options                text,                                     -- undecided + ready_partial 후보 선택지 (CSV)
  blocked_reason         text,                                     -- unassigned 카드 해석 실패 이유

  tags                   text,                                     -- 태그 (CSV)
  source                 text,                                     -- 출처: ai_parse / manual / ai_recommend
  notes                  text,                                     -- open_question 답변 입력 (사용자 작성)
  memo                   text,                                     -- 사용자 자유 메모 (SCR-05 활용)

  -- Day 배치 (FE 로컬 관리, verify/confirm 시 일괄 저장)
  day                    integer,                                  -- 배치된 Day 번호 (미배치 시 null)

  -- 숙소 전용
  check_in               text,                                     -- YYYY-MM-DD
  check_out              text,                                     -- YYYY-MM-DD

  -- 교통 전용
  flight_number          text,                                     -- 항공편 번호

  -- 공간 (lat/lng 기반 generated column, SRID 4326)
  geom                   geometry(Point, 4326)
    generated always as (
      case
        when lat is not null and lng is not null
          then st_setsrid(st_makepoint(lng, lat), 4326)
        else null
      end
    ) stored,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists idx_place_cards_trip_id on public.place_cards (trip_id);
create index if not exists idx_place_cards_geom    on public.place_cards using gist (geom);
