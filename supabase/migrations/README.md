# Database migrations

One file per applied migration, named `<version>_<name>.sql`, mirroring the
live project's `supabase_migrations.schema_migrations` table (which is the
source of truth for what has been applied). The history up to
`20260719004647` was reconstructed from that table after the fact — from
`20260705003524` through `20260706000617` the DB was shared bootstrap work
with the `fragrance-db` catalog repo, which is why catalog-only migrations
appear here too.

## Workflow for schema changes

1. Write the change as a new `supabase/migrations/<version>_<name>.sql` file
   (version = `YYYYMMDDHHMMSS` UTC now, name = snake_case).
2. Apply it with the Supabase MCP `apply_migration` tool using the same
   `name` and the file's exact contents — never `execute_sql` and never the
   dashboard SQL editor for DDL. `apply_migration` records the migration in
   `schema_migrations`, keeping DB history and repo history identical.
3. Update `db/schema.sql` — it stays the readable, commented description of
   the CURRENT schema (what a fresh project would need), while this folder is
   the append-only history of how it got there.
4. Regenerate `src/lib/database.types.ts` (MCP `generate_typescript_types`)
   if any table/RPC shape changed, then `yarn typecheck`.

## Rules learned the hard way

- `CREATE OR REPLACE FUNCTION` preserves the existing ACL — a function
  recreated without re-asserting its `REVOKE`/`GRANT` lines silently keeps
  (or regains, on first create: PUBLIC gets EXECUTE by default) broader
  access than schema.sql declares. Every migration that (re)creates a
  function must end with its full REVOKE/GRANT block.
  (`lock_down_wear_writes_and_rpc_grants` cleaned up exactly this drift.)
- `REVOKE ... FROM anon` alone does not block anon — revoke from `PUBLIC`
  and grant `authenticated` explicitly
  (see `fix_public_grant_leak_on_security_definer_rpcs`).
- Data-changing statements (backfills) belong in migrations too, so the
  history replays correctly (see `add_fragrance_ratings_community_table`).
