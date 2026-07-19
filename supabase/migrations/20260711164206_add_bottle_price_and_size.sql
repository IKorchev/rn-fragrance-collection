alter table public.user_fragrances
  add column bottle_price numeric(10,2) check (bottle_price >= 0),
  add column bottle_size_ml integer check (bottle_size_ml > 0);
