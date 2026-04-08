-- SCR-02 최소 스키마

-- 여행 세션 (SCR-01 온보딩에서 생성)
create table if not exists public.trips (
  trip_id           uuid        primary key,                    -- 여행 세션 고유 ID
  travel_days       smallint    not null,                       -- 여행 일수
  companion_count   smallint    not null,                       -- 동행 인원 (1 = 혼자)
  has_flight        boolean     not null,                       -- 항공편 보유 여부
  has_accommodation boolean     not null,                       -- 숙소 보유 여부
  confirmed_at      timestamptz,                                -- 일정 확정 시각 (SCR-05)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Dump 파싱 작업 (SCR-02 텍스트 제출 시 생성, SCR-02P에서 상태 폴링)
create table if not exists public.dump_jobs (
  job_id          uuid        primary key,                      -- 파싱 작업 고유 ID
  trip_id         uuid        not null references public.trips(trip_id), -- 소속 여행 세션
  dump_text       text        not null,                         -- 사용자가 입력한 자유 텍스트
  status          varchar     not null default 'pending',       -- 작업 상태: pending / processing / completed / failed
  step            smallint,                                     -- 파싱 진행 단계 (1~3), null이면 미시작
  error_code      varchar,                                      -- 실패 시 오류 코드: PARSE_FAILED / NO_PLACES_FOUND
  context_summary text,                                         -- AI가 파악한 여행 스타일 요약
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- 장소 카드 (AI 파싱 결과로 생성)
create table if not exists public.place_cards (
  instance_id            uuid        primary key,               -- 카드 인스턴스 ID (중복 장소 허용)
  trip_id                uuid        not null references public.trips(trip_id), -- 소속 여행 세션
  place_id               text,                                  -- Google Places place_id
  status                 varchar     not null default 'loading', -- 카드 상태: loading / success / error
  name                   text        not null,                   -- 장소명
  category               varchar     not null default '미분류',   -- 카테고리: 관광 / 쇼핑 / 식사 / 숙박 / 교통 / 미분류
  classification         varchar     not null default 'unassigned', -- 분류: confirmed / open_question / undecided / unassigned
  estimated_duration_min smallint    default 60,                 -- 예상 체류시간 (분)
  time_constraint        text,                                   -- 시간 제약 설명
  is_ai_generated        boolean     not null default false,     -- AI 자동 생성 여부
  conflict_type          varchar,                                -- 충돌 유형: timing_constraint / choice_conflict
  conflict_reason        text,                                   -- 충돌 사유
  remind                 text,                                   -- 방문 전 주의사항 (JSON 배열)
  lat                    double precision,                       -- 위도
  lng                    double precision,                       -- 경도
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

