alter table public.place_cards
  add column if not exists search_alias text;
