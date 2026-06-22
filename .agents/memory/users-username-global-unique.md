---
name: users.username global unique constraint
description: The users table has a DB-level global unique index on username that is NOT declared in shared/schema.ts
---

The `users` table has a **global** unique constraint `users_username_unique` on `username` (verified via `pg_constraint` / `pg_indexes`). This is enforced at the database level but is **NOT** declared with `.unique()` in `shared/schema.ts` — reading the schema file alone is misleading.

**Why it matters:** Any flow that creates users across tenants cannot reuse the same username (e.g. a literal `"admin"` for every tenant's admin). Inserts collide with Postgres error `23505`. Namespace per-tenant usernames with something globally unique (e.g. `admin_<subdomain>`), and/or retry on `23505`.

**How to apply:** When auto-creating users (tenant provisioning, seeding, imports), assume username must be globally unique. Wrap multi-row creates (tenant + user) in a `db.transaction` so a username collision rolls back the tenant instead of leaving an orphan.
