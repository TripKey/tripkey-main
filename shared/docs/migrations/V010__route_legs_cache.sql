create table if not exists public.route_legs_cache (
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
