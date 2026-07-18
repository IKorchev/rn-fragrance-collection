# Personalized recommendations

The **For You** tab recommends catalog fragrances with a single authenticated
Supabase RPC: `recommend_fragrances(max_results)`. Candidate generation,
collection exclusion, scoring, explanations, and diversification all happen in
Postgres. The React Native client only requests and renders the final rows.

This design replaces the earlier client-side pipeline, which fetched multiple
datasets and ranked them on the device.

## High-level flow

```text
User collection ─────► preferred-brand candidates ┐
Community aggregates ► popular candidates         ├─► merge and score
Full catalog ─────────► daily exploration sample  ┘

merge and score ─► remove owned items ─► max 3 per brand ─► top 20
```

The implementation is split across:

- `db/schema.sql`: authoritative database schema.
- `db/recommendations.sql`: idempotent deployment migration.
- `src/lib/queries.ts`: the single client query hook.
- `src/app/(tabs)/(discover)/(top-tabs)/recommendations.tsx`: For You screen.
- `src/components/recommendation-list-item.tsx`: recommendation card.

## Request lifecycle

The app calls:

```ts
supabase.rpc("recommend_fragrances", { max_results: 20 })
```

The RPC requires `auth.uid()`. It clamps `max_results` to the range 1–50,
with 20 as the default.

Before generating candidates, the RPC builds an `owned` set from the user's
collection. A catalog fragrance is excluded when either:

1. Its catalog ID already appears in `user_fragrances.fragrance_id`; or
2. Its normalized `"Brand - Name"` matches a collection row.

The second check prevents manually added fragrances from being recommended as
catalog duplicates.

## Building the preference profile

Each collection row contributes affinity toward its brand. The RPC uses the
catalog brand when the row is catalog-linked and otherwise extracts the brand
from the stored `"Brand - Name"` value.

For one collection row:

```text
rating signal:
  no rating       = 0.5
  personal rating = rating - 3

wear signal       = ln(1 + times_worn) × 0.65
recent signal     = 0.25 when last worn within 30 days, otherwise 0

item affinity     = max(0, rating signal + wear signal + recent signal)
```

When both rating sources exist, the user's row in `fragrance_ratings` takes
precedence over `user_fragrances.rating`. Affinity is summed by normalized
brand name, and the eight strongest brands become the preferred brands.

The logarithmic wear term rewards repeated use without allowing a very large
wear count to dominate every other signal.

## Candidate generation

The RPC combines three candidate pools.

### 1. Preferred-brand candidates

Up to 240 catalog rows are selected from the user's eight preferred brands.
Within that pool, stronger brand affinity comes first, followed by recent
community wear, total community wear, and catalog ID.

The expression index on `lower(fragrances.brand)` avoids scanning the complete
catalog for each preferred brand.

### 2. Popular candidates

Up to 240 rows are read from `fragrance_community_stats`, ordered by recent
wear weight and total wear count. Rows without any wear or rating activity are
not included in this pool.

### 3. Exploration candidates

Up to 120 rows are sampled from the wider catalog. The sample is deterministic
for a user and calendar day:

```text
seed = UUID-shaped MD5(auth.uid + current_date)
```

Postgres seeks forward from that UUID in the catalog primary-key index and
wraps to the beginning when necessary. This produces daily variety without an
expensive `ORDER BY random()`, and results do not reshuffle on every render.
The new daily seed takes effect the next time the RPC is fetched.

The three pools are merged by fragrance ID. A fragrance appearing in multiple
pools keeps its strongest affinity.

## Community aggregates

Recommendation reads never aggregate the raw `wear_events` or
`fragrance_ratings` tables. Instead, they read:

```text
fragrance_community_stats
├── fragrance_id
├── wear_count
├── recent_wear_weight
├── last_worn_at
├── rating_sum
└── rating_count
```

Two database triggers maintain this table:

- Wear inserts increment wear count and recent weight.
- Wear deletion, including Undo, subtracts the old contribution and finds the
  remaining latest wear.
- Wear updates move the old contribution out and the new contribution in.
- Rating inserts, updates, and deletes adjust rating sum and count in O(1).

The migration performs a one-time transactional backfill before installing the
triggers. It briefly locks wear and rating writes so that no committed activity
can be missed between the backfill and trigger creation.

### Recent-wear decay

Recent popularity uses a 30-day half-life. A wear's effective contribution at
request time is:

```text
2 ^ (-age_in_days / 30)
```

The stored value is represented relative to a fixed epoch. Because all rows
share the same query-time decay factor, their stored ordering does not change
with time and can be served by a B-tree index.

### Supporting indexes

- `fragrance_community_stats_popularity_idx`: recent weight and total wears.
- `fragrances_lower_brand_id_idx`: case-insensitive preferred-brand lookup.
- `wear_events_fragrance_worn_at_idx`: latest wear after an Undo or update.
- `fragrances_pkey`: exploration UUID seeks and catalog joins.

## Scoring

Every merged candidate receives three normalized signals.

### Affinity score

The candidate's preferred-brand affinity is divided by the strongest preferred
brand affinity. It is zero for candidates outside the preferred-brand pool.

### Popularity score

```text
raw popularity =
  ln(1 + total wears)
  + 2 × ln(1 + decayed recent-wear weight)
```

Raw popularity is divided by the highest raw popularity in the current
candidate pool.

### Rating score

Community ratings use a Bayesian average with a 3.5-star prior carrying five
virtual votes:

```text
bayesian rating = (rating_sum + 3.5 × 5) / (rating_count + 5)
rating score    = (bayesian rating - 1) / 4
```

This prevents a fragrance with one five-star rating from automatically
outranking a fragrance with many reliable ratings.

### Final weights

When the user has preference signals:

```text
final score =
  affinity  × 0.52
  + popularity × 0.30
  + rating     × 0.18
```

For a cold-start user without preference signals:

```text
final score =
  popularity × 0.65
  + rating   × 0.35
```

## Explanations and diversification

The first matching rule supplies the user-facing reason:

1. Positive affinity: **Matches your interest in [Brand]**
2. Average rating at least 4.2 with at least five ratings:
   **Highly rated by the community**
3. At least one wear: **Popular with fragrance collectors**
4. Otherwise: **A new scent to explore**

After scoring, results are partitioned by case-insensitive brand and limited to
three rows per brand. The highest-scoring rows are then returned up to the
requested limit.

The explanation describes the strongest applicable rule; it is not a complete
breakdown of every factor included in the score.

## Client caching and refreshes

`useRecommendations(userId, collectionReady)` uses the query key
`["recommendations", userId]` and a six-hour stale time. It waits until the
initial collection query resolves, preventing an unpersonalized request from
racing a second personalized request during startup.

The cache is invalidated when relevant data changes:

- Catalog or manual collection add.
- Collection deletion.
- Collection name or personal rating update.
- Community rating update.
- Wear or Undo.
- Realtime collection changes, including changes from another device.

The local update path does not explicitly refresh recommendations for notes,
tags, or image-only changes because they are not model inputs. The broad
Realtime collection listener can still mark the cache stale after any row
change.

## Security

`fragrance_community_stats` has RLS enabled, no client policies, and all table
privileges revoked from `PUBLIC`, `anon`, and `authenticated`.

`recommend_fragrances` is a `SECURITY DEFINER` function with a fixed
`search_path`. Execution is revoked from `PUBLIC` and `anon`, granted only
to `authenticated`, and the function rejects requests without `auth.uid()`.
The helper and trigger functions are not client-executable.

This lets the RPC read cross-user aggregate data without exposing aggregate
rows or another user's personal activity.

## Performance

At deployment, the live database contained roughly 64,000 catalog fragrances.
The RPC returned 20 rows in approximately 39 ms of database execution time.

A separate local benchmark with 50,000 fragrances and 100,000 wear events
measured approximately 27–41 ms. The latest-wear lookup used by Undo measured
about 0.27 ms with the composite index.

These are point-in-time database measurements. End-to-end app latency also
includes network and API gateway time.

## Current limitations

- Personalization is primarily brand-based because the catalog deliberately
  contains only trustworthy name, brand, image, and source data. Scraped notes,
  accords, gender, and ratings are not used.
- Sparse community activity means exploration and prior-smoothed ratings have
  more influence until additional wears and ratings are logged.
- Community popularity is global; there is no demographic, geographic, or
  social-neighbor model.
- The RPC returns one concise reason rather than exposing raw scores or a full
  explanation breakdown.
- Results are calculated on request rather than precomputed per user. The
  indexed candidate pools make this inexpensive at the current catalog size.

## Changing the model

When changing candidate limits, weights, reasons, aggregate columns, or return
types:

1. Update the personalized-recommendations section in `db/schema.sql`.
2. Keep `db/recommendations.sql` synchronized or create the next migration.
3. Deploy through the Supabase migration tooling.
4. Regenerate `src/lib/database.types.ts` from the deployed schema.
5. Run `yarn typecheck`.
6. Run `maestro test .maestro/flows/recommendations.yaml` against a signed-in
   Android dev-client session.
7. Verify result uniqueness, owned-item exclusion, the three-per-brand cap,
   aggregate/source totals, RPC privileges, and an `EXPLAIN ANALYZE` timing.
