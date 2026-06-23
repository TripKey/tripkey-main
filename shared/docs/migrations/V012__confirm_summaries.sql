-- TripKey migration: confirm_summaries table
-- Scope: SCR-05 confirmed itinerary snapshot generated after confirm.
-- Stores BE/AI generated output separately from existing parse/enrichment alert_cards.

create table if not exists public.confirm_summaries (
  trip_id          uuid        primary key references public.trips(trip_id),
  status           text        not null,                       -- completed | pending | fallback | failed (initial MVP: completed)
  generation_mode  text        not null,                       -- rule_based | ai | mixed
  summary_json     jsonb       not null,                       -- SCR-05 internal snapshot payload
  generated_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
