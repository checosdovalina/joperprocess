---
name: Sequential ticket/folio number generation
description: Why per-tenant sequence numbers must derive from MAX existing suffix, not COUNT(*)
---

# Sequential number generation (incident tickets, etc.)

Generate the next sequence number from the **MAX existing numeric suffix** for the
tenant/year, never from `COUNT(*) + 1`.

**Why:** Incidents (and similar records) can be deleted. `COUNT(*)+1` drops after a
deletion and re-generates a number that still exists on another row, violating the
`ticket_number` UNIQUE constraint — surfaced to users as a generic "no se pudo crear"
error. This was the root cause of a recurring incident-creation failure.

**How to apply:** Use
`COALESCE(MAX(CAST(SUBSTRING(col FROM 'PREFIX-[0-9]+-([0-9]+)$') AS INTEGER)),0)+1`,
scoped by tenant_id + `col LIKE 'PREFIX-<year>-%'`. SUBSTRING returns NULL on
non-match and CAST(NULL) stays NULL, so malformed rows are skipped safely. A
concurrency race still exists, so wrap the insert in a retry loop that regenerates
the number on unique_violation (Postgres code 23505). Same helper feeds both the
internal and public-portal create routes.
