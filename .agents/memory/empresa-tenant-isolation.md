---
name: empresa + tenant isolation on by-id endpoints
description: How commercial-brand (empresa) isolation and tenant isolation must both be enforced, especially on by-id lookups.
---

# Empresa (marca comercial) + tenant isolation

`empresas` are a commercial level BELOW a tenant: many empresas share ONE tenant's
db/customers/products/Microsip. A vendedor with `users.empresaId` set must see ONLY
their empresa's quotations/orders/shipments; `empresaId=null` users (producción/admin)
see everything within their tenant. `empresaId` is inherited & immutable: order derives
it from quotation, shipment from order; never client-settable.

## Two isolation axes must BOTH be checked on by-id / raw lookups
Any handler that does `db.query.X.findFirst({ where: eq(X.id, id) })` (raw ID, no tenant
predicate) leaks across BOTH axes:
- **Empresa**: compare `rec.empresaId` vs `createTenantScopedStorage(req).getRestrictedEmpresaId()`
  (returns empresaId only for restricted vendedores, null otherwise) → 403 on mismatch.
- **Tenant**: compare `rec.tenantId` vs `getEffectiveTenantId(req)` → 404 on mismatch.
  Guard only fires when effectiveTenantId is non-null, so superadmin-global (null) still works.

**Why:** empresa scoping alone still lets an `empresaId=null` internal user read/write
another TENANT's record by guessing a UUID. Adding empresa checks to these endpoints does
NOT fix the pre-existing tenant IDOR — you must add the tenant guard too.

## How to apply
- Prefer scoped storage getters (`TenantScopedStorage.getQuotation/getOrder/getShipment`)
  which enforce tenant AND empresa (return undefined on mismatch). Use them in
  `createOrder`/`createShipment` to derive the parent's empresaId, and hard-fail if the
  parent is out of scope (blocks creating from a foreign-empresa/tenant parent).
- On raw by-id read/write endpoints that need full relations, add the tenant + empresa
  guards inline right after fetch, before any mutation. On PATCH, also `delete body.empresaId`
  and fail-fast (404) if the scoped `updateX` returns falsy before doing raw child-row
  delete/insert (e.g. quotationItems).
- List-shaped/aggregate endpoints (pipeline, board, reports, customer summary): add empresa
  (and tenant where missing) predicates to the where-clause or post-filter.
- `TenantScopedStorage` uses `ctx.allowGlobal` for superadmin on the main domain — keep those
  paths unguarded on purpose.

Known separate follow-up: many OTHER by-id endpoints app-wide still lack tenant guards
(pre-existing). Audit them for the same pattern.
