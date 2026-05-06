-- Schema for PlaceCardRepositoryIntegrationTest.
-- Mirrors shared/docs/schema.sql + V001__postgis_foundation.sql so Hibernate
-- ddl-auto=validate accepts the full entity model (Trip, TripDestination,
-- DumpJob, PlaceCard).

create extension if not exists postgis;

create table trips (
  trip_id            uuid        primary key,
  travel_days        smallint    not null,
  companion_count    smallint    not null,
  has_flight         boolean,
  has_accommodation  boolean,
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table trip_destinations (
  id          bigserial   primary key,
  trip_id     uuid        not null references trips(trip_id),
  name        text        not null,
  sort_order  smallint    not null default 0
);

create table dump_jobs (
  job_id          uuid        primary key,
  trip_id         uuid        not null references trips(trip_id),
  dump_text       text        not null,
  status          text        not null,
  step            smallint,
  error_code      text,
  context_summary text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table place_cards (
  instance_id            uuid        primary key,
  trip_id                uuid        not null references trips(trip_id),
  place_id               text,
  status                 text,
  name                   text        not null,
  category               text        not null,
  classification         text        not null,
  placement_status       text        not null default 'ready_partial',
  processing_status      text        not null default 'completed',
  action_type            text        not null default 'review_only',
  can_exclude            boolean     not null default true,
  allow_duplicate        boolean     not null default false,
  is_excluded            boolean     not null default false,
  is_ai_generated        boolean     not null,
  estimated_duration_min smallint,
  lat                    double precision,
  lng                    double precision,
  location               text,
  address                text,
  time_constraint        text,
  user_context           text,
  tips                   text,
  question_text          text,
  options                text,
  blocked_reason         text,
  tags                   text,
  source                 text,
  notes                  text,
  memo                   text,
  day                    integer,
  check_in               text,
  check_out              text,
  flight_number          text,
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

create index idx_place_cards_geom on place_cards using gist (geom);
