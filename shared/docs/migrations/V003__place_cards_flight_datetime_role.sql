alter table public.place_cards
  add column if not exists flight_datetime text,
  add column if not exists flight_role text;
