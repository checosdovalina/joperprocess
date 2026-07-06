---
name: Document/blob upload ownership binding
description: How direct-upload endpoints must bind an issued entityId to the requesting user before accepting a metadata-create call.
---

# Upload entityId → user binding

When a route hands out an upload target (a signed URL entityId for GCS, or a
`doc-<ts>-<rand>` id for local direct upload) and a *separate* later route
creates the DB record from a client-supplied `fileUrl`/`entityId`, you MUST bind
the issued id to the requesting user and verify it on the create call.

**Why:** Without binding, an authenticated (even privileged/ADMIN) user can POST
a `fileUrl` pointing at *another tenant's* object id and expose it through the
normal tenant-scoped download flow. Tenant-scoped storage alone does not help
because the attacker inserts the row into *their own* tenant.

**How to apply:** Keep an in-memory `Map<entityId, {userId, expiresAt}>`
(TTL ~30 min). Populate it when the upload URL is issued; on the direct-upload
PUT and on the metadata-create POST, reject if the id is missing/expired or
`userId` mismatches; delete the entry after the record is created. userId
binding is enough — a user belongs to one tenant and scoped storage derives the
tenant from that same user context.

## documents.category stored as name (not categoryId) — intentional

Document category is picked from the product-categories table but persisted as
the category **name string** in `documents.category`, not a categoryId FK.
**Why:** keeps the existing distinct-category list filter working with zero
schema migration; renames are a rare edge case for this internal tool. Do not
"fix" this into a FK without also migrating the filter + display + legacy rows.

**Gotchas:**
- Also enforce the size limit *while streaming* the request body (break the
  `for await` loop once bytes exceed the max) — never `Buffer.concat` first,
  which lets an oversized payload exhaust memory.
- Iterating a `Map` with `for...of` trips TS2802 (downlevelIteration) in this
  repo's tsconfig; use `Array.from(map.entries()).forEach(...)` instead. Do not
  edit tsconfig.
