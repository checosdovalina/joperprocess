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

## Reusable guard: assertTenantScope (server/routes.ts)
The two-axis by-id guard is now consolidated in one helper near `getEffectiveTenantId`:
`assertTenantScope(req, res, record, { notFoundMessage, forbiddenMessage?, messageKey?, checkEmpresa? })`.
It fetches-nothing (you pass the already-fetched record), returns a type-guard boolean, and
writes the 404 (missing/other-tenant) or 403 (other-empresa) response itself, so the safe path
is one line: `if (!assertTenantScope(req, res, rec, {...})) return;`. Empresa axis is OPT-IN via
`checkEmpresa: true` (only for records with an empresaId column — quotations/orders/shipments);
tenant-only records (products/invoices/users/scheduledVisits) omit it. New by-id endpoints MUST
use this instead of hand-writing the inline `if (tenantId && rec.tenantId !== ...)` block.
**Watch-out:** the helper always checks tenant(404) BEFORE empresa(403). The old quotation PATCH
checked empresa first, so a cross-tenant+restricted request now returns 404 instead of 403
(strictly safer, both deny). List-shaped/pipeline endpoints still post-filter and do NOT use this.

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

By-id endpoint audit is DONE across server/routes.ts: scheduledVisits, products, invoices
(incl. accounts-receivable/:id), shipmentProductInstances, and credit_authorizations all now
guard by tenant (via getEffectiveTenantId or scoped getters). **Watch DELETE handlers
specifically:** the read + PATCH product-instances endpoints scoped via the parent shipment,
but the DELETE variant was left unguarded (raw delete-by-id) for a while — audit every verb
(GET/PATCH/DELETE) of a by-id resource independently, don't assume a sibling handler's guard
covers the whole route family. Write-path isolation (cross-company PATCH/DELETE returns 404/403
AND leaves the row unchanged) is now regression-locked in server/isolation.test.ts alongside
the read-path cases. Note: there is NO payments by-id write endpoint (only collection GET/POST),
so payments have no by-id write guard to test. Special case: `credit_authorizations`
has NO tenant_id column at all — see credit-auth-tenant-scoping.md (scope via quotation).
Endpoints found already-safe (do not re-guard): account-statement-schedule (tenantId in
where-clause), pending-uploads (userId-bound), customers/documents/empresas/product-categories
(use scoped storage), incidents/checkins/orders-details (already guarded). Note: raw tenants.id
branding lookups are fine (tenant already resolved), and internal email-assembly customer
lookups use an already-scoped quotation so they don't leak.
