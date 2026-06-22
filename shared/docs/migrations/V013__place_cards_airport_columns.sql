alter table public.place_cards
  add column if not exists departure_airport text,
  add column if not exists arrival_airport text;
