---
name: Drizzle db instance typing
description: Why server/db.ts must export db as a concrete NodePgDatabase<typeof schema>
---

The exported `db` in `server/db.ts` must be typed as the concrete
`NodePgDatabase<typeof schema>` (pass the schema generic). If it is left as a
looser/inferred type, `db.query.<table>` relational queries resolve to `{}`
(so `.findFirst`/`.findMany` don't exist) and `db.insert(table).values(x)` loses
the table's real insert type — hundreds of phantom tsc errors cascade from this
single spot.

**Why:** the relational query builder and the `$inferInsert` machinery only
attach when the schema generic is bound to the db type.

**How to apply:** keep the explicit `NodePgDatabase<typeof schema>` annotation on
`db`. When you see a flood of `db.query.* is {}` or "tenantId missing in insert"
errors, check this first before touching call sites.

Related: base insert methods in `storage.ts` take `InsertX` (which omits the
required `tenantId`); `TenantScopedStorage.withTenant()` adds tenantId at runtime
but returns it as OPTIONAL, so base params can't require it. The type-only fix is
to cast `.values(x as typeof table.$inferInsert)` at each base insert.
