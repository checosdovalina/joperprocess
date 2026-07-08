---
name: company hierarchy (Opción B — empresas hijas)
description: How parent/child company tenants nest, how an admin switches into a descendant, and how isolation is enforced.
---

# Company hierarchy (Nexxo → Compañía → Empresas hijas)

Companies are TENANTS that can nest via a self-referencing `tenants.parentId`
(nullable). Each child company has its OWN isolated data (Opción B). A
non-superadmin ADMIN of a parent company may switch into and manage ANY
DESCENDANT company; SIBLINGS must never see each other's data. Subdomains stay
flat (no subdomain nesting).

## How switching works (the whole mechanism hinges on req.tenant)
- A recursive CTE (`getAccessibleTenantIds(rootId)`) returns self + all
  descendants. Sibling isolation falls out of the tree walk.
- Middleware validates an incoming selected-tenant header against that set (and
  that the tenant is active), then OVERWRITES `req.tenant` with the child
  context. It only runs for role ADMIN && !isSuperAdmin; superadmins keep their
  own selection path; vendedores can never switch.
- **Why this is enough:** all scoping helpers prioritize `req.tenant.id` first,
  so overwriting `req.tenant` makes every downstream read/write/IDOR guard,
  plus `/api/tenant-config` branding, follow the switched company automatically.

## How to apply / watch out for
- Any handler that reads tenant from `req.user.tenantId` (instead of
  `getEffectiveTenantId(req)` / scoped storage) will NOT honor the switch — it
  silently operates on the admin's HOME company. Route everything through the
  effective-tenant helpers so the switch is consistent across ALL modules.
- The child-create endpoint must FORCE `parentId = req.user.tenantId` and strip
  any client-supplied parentId (prevents grafting a company under a foreign
  parent).
- Superadmin has `tenantId = null`; company-list endpoints return empty/400 for
  them by design — they use the platform tenant panel instead.
