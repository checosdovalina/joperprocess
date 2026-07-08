---
name: credit_authorizations has NO tenant_id column
description: Why credit-authorization endpoints leak across tenants unless scoped via their quotation.
---

# credit_authorizations must be scoped via its quotation

`credit_authorizations` has NO `tenant_id`/`empresa_id` column of its own — it is
tenant-scoped ONLY indirectly through `quotationId → quotations.tenantId`.

**Why this bites:** the obvious `db.query.creditAuthorizations.findMany()` (and
the base storage getters) return ALL rows platform-wide, leaking across sibling
tenants. The `TenantScopedStorage` credit-auth methods historically delegated
straight to `base` with a misleading "verify via quotation" comment but no
actual check.

**How to apply:** never query credit authorizations by raw id / unfiltered list.
Both isolation axes (tenant AND empresa-marca) must be enforced via the quotation.
- List: filter `creditAuthorizations.quotationId IN (SELECT id FROM quotations
  WHERE tenant_id = getEffectiveTenantId(req)` AND, when the caller is a
  restricted vendedor (`getRestrictedEmpresaId()` non-null), also
  `empresa_id = restrictedEmpresaId)`.
- get/update: resolve the parent quotation through the scoped
  `getQuotation()` (which enforces tenant + empresa) and 404 if it is undefined
  before returning/mutating.
