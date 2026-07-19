-- Community fragrance ratings: decoupled from user_fragrances so a rating
-- survives collection-row deletion/duplication and isn't tied to ownership.
-- One rating per user per catalog fragrance. Mirrors the wear_events split:
-- own-rows RLS here, cross-user aggregation only via a SECURITY DEFINER RPC.
create table fragrance_ratings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  fragrance_id  uuid not null references fragrances(id) on delete cascade,
  rating        smallint not null check (rating between 1 and 5),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, fragrance_id)
);

create index fragrance_ratings_fragrance_id_idx on fragrance_ratings (fragrance_id);

alter table fragrance_ratings enable row level security;

create policy "own ratings" on fragrance_ratings for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Batched so a list screen makes one call for a whole page instead of N+1.
create or replace function get_fragrance_ratings(fragrance_ids uuid[])
returns table (fragrance_id uuid, avg_rating double precision, rating_count bigint)
language sql stable security definer
set search_path = public
as $$
  select fr.fragrance_id, avg(fr.rating)::double precision, count(*)::bigint
  from fragrance_ratings fr
  where fr.fragrance_id = any(fragrance_ids)
  group by fr.fragrance_id
$$;

revoke execute on function get_fragrance_ratings(uuid[]) from anon;

-- Seed from the 3 existing catalog-linked personal ratings so nothing is lost,
-- then clear them there — user_fragrances.rating becomes manual-add-only.
insert into fragrance_ratings (user_id, fragrance_id, rating)
select user_id, fragrance_id, rating
from user_fragrances
where fragrance_id is not null and rating is not null
on conflict (user_id, fragrance_id) do nothing;

update user_fragrances set rating = null
where fragrance_id is not null and rating is not null;
