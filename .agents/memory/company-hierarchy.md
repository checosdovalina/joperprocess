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

## Who configures the hierarchy (structural config = superadmin ONLY)
- **Decision:** creating and nesting companies is done exclusively by the
  platform superadmin (Nexxo) via the `/api/tenants` panel. POST/PATCH
  `/api/tenants` accept an optional `parentId` (validated separately because
  `insertTenantSchema` OMITS parentId). PATCH guards against self-parent and
  cycles (reject parentId ∈ `getAccessibleTenantIds(id)`).
- Company ADMINs can NO LONGER create companies. There is NO admin child-create
  endpoint anymore — GET `/api/companies` is read-only (view tree + operate via
  switcher). The old admin POST `/api/companies` was removed.
- **Why:** users wanted structural changes locked to a trusted platform role to
  avoid accidental misconfiguration by day-to-day admins.
- Public self-registration (`POST /api/register-company`) is KEPT but creates the
  tenant `active:false` (pending approval); the superadmin activates it from the
  `/tenants` panel (one-click "Activar" = PATCH `{active:true}`). Inactive tenants
  are fully blocked by tenantMiddleware (403) so a pending company cannot operate
  until approved. Credentials are still emailed at registration (plaintext
  password only exists then); the welcome email has a `pendingApproval` mode.

## Empresa (brand) subdomains resolve to the PARENT tenant
- An empresa (brand, `empresas` table) may own a `subdomain`. tenantMiddleware
  resolves it in two steps: try `tenants.subdomain`; on miss, look up
  `empresas.subdomain`, and if active set `req.tenant` = the empresa's PARENT
  tenant (via `getTenantById(empresa.tenantId)`) plus `req.empresa` = brand
  context. Unknown subdomain still 404s for `/api/` paths.
- `/api/tenant-config` overrides name/logo/colors from `req.empresa` and exposes
  `empresaId`; the tenant `id` stays the parent so auth/data stay parent-scoped.
- **Why:** a brand subdomain (e.g. `jmobil.nexxo.com.mx`) must log in against
  the parent company (Joper) and SHARE its data, only showing the brand's look.
- **Watch out:** `req.empresa` is context only — writes are NOT auto-scoped to
  the empresa (no implicit `empresaId` defaulting). Empresa assignment on new
  docs still comes from the picker / `user.empresaId`. Dev-only `?empresa=`
  (or `x-empresa-subdomain` header) override exists for local testing.

## How to apply / watch out for
- Any handler that reads tenant from `req.user.tenantId` (instead of
  `getEffectiveTenantId(req)` / scoped storage) will NOT honor the switch — it
  silently operates on the admin's HOME company. Route everything through the
  effective-tenant helpers so the switch is consistent across ALL modules.
- Superadmin has `tenantId = null`; the admin company-list endpoint returns
  empty/400 for them by design — they use the platform `/tenants` panel instead.

## Empresa (marca) vs compañía hija — a recurring user confusion
- "Empresa" rows (empresas table, per-tenant marcas like Ligero/Móvil) are NOT
  the same as compañías hijas (child tenants via parentId). Board selectors
  that count `empresas.length > 1` stay hidden when the user only created one
  empresa plus a child COMPANY.
- Pipeline board now has a company `<select>` (Todas las compañías / each
  accessible company) for admins with hijas; picking one sends `?tenantId=`,
  validated server-side against getAccessibleTenantIds. Pipeline item expansion
  allows any accessible tenant for admins (header-only scoping broke expand
  under scope=all).
