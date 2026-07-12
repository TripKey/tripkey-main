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
  start_date         date,
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
  context_summary  text,
  departure_flight jsonb,
  return_flight    jsonb,
  accommodation_inputs jsonb,
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
  pending_reorder        boolean     not null default true,
  estimated_duration_min smallint,
  lat                    double precision,
  lng                    double precision,
  location               text,
  address                text,
  time_constraint        text,
  opening_hours          jsonb,
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
  day_order              smallint,
  check_in               text,
  check_out              text,
  flight_number          text,
  flight_datetime        text,
  flight_role            text,
  departure_airport      text,
  arrival_airport        text,
  search_alias           text,
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

create table alert_cards (
  id                    bigserial   primary key,
  trip_id               uuid        not null references trips(trip_id),
  job_id                uuid        references dump_jobs(job_id),
  alert_id              text        not null,
  type                  text        not null,
  category              text        not null,
  scope                 text        not null default 'trip',
  day                   smallint,
  message               text        not null,
  related_instance_ids  text,
  created_at            timestamptz not null default now(),
  constraint uq_alert_cards_trip_alert unique (trip_id, alert_id)
);

create index idx_alert_cards_trip_id on alert_cards (trip_id);

create table enrichment_outbox (
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
create index idx_enrichment_outbox_pending on enrichment_outbox (created_at) where status = 'pending';

create table route_legs_cache (
  id               bigserial   primary key,
  origin_lat       double precision not null,
  origin_lng       double precision not null,
  dest_lat         double precision not null,
  dest_lng         double precision not null,
  duration_seconds integer     not null,
  distance_meters  integer     not null,
  mode             text        not null,
  source           text        not null,
  created_at       timestamptz not null default now(),
  constraint uq_route_legs unique (origin_lat, origin_lng, dest_lat, dest_lng)
);

create table confirm_summaries (
  trip_id          uuid        primary key references trips(trip_id),
  status           text        not null,
  generation_mode  text        not null,
  summary_json     jsonb       not null,
  generated_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
