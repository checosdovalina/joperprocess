import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { tenants, empresas } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface TenantContext {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  active: boolean;
  timezone: string | null;
  locale: string | null;
}

export interface EmpresaContext {
  id: string;
  tenantId: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      empresa?: EmpresaContext;
    }
  }
}

const BASE_DOMAIN = "nexxo.com.mx";
const DEV_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0", ".replit.dev", ".replit.app"];

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Support X-Forwarded-Host from reverse proxy (Nginx)
  const forwardedHost = req.headers['x-forwarded-host'] as string | undefined;
  const hostname = forwardedHost?.split(":")[0] || req.hostname || req.headers.host?.split(":")[0] || "";
  
  let subdomain: string | null = null;
  let devEmpresaOverride: string | null = null;
  
  if (DEV_DOMAINS.some(d => hostname.includes(d))) {
    const querySubdomain = req.query.tenant as string | undefined;
    const headerSubdomain = req.headers["x-tenant-subdomain"] as string | undefined;
    // Dev-only: allow testing an empresa (brand) subdomain via ?empresa= or header.
    devEmpresaOverride = (req.query.empresa as string | undefined)
      || (req.headers["x-empresa-subdomain"] as string | undefined)
      || null;
    subdomain = querySubdomain || headerSubdomain || "joper";
  } else if (hostname.endsWith(`.${BASE_DOMAIN}`)) {
    subdomain = hostname.replace(`.${BASE_DOMAIN}`, "");
  } else if (hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}`) {
    return next();
  }
  
  if (!subdomain) {
    return next();
  }
  
  try {
    // Dev-only: an explicit empresa override takes precedence for local testing.
    if (devEmpresaOverride) {
      const devResolved = await resolveEmpresaSubdomain(devEmpresaOverride);
      if (devResolved && devResolved.tenant.active) {
        req.tenant = devResolved.tenant;
        req.empresa = devResolved.empresa;
        return next();
      }
    }

    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
        logoUrl: tenants.logoUrl,
        primaryColor: tenants.primaryColor,
        secondaryColor: tenants.secondaryColor,
        active: tenants.active,
        timezone: tenants.timezone,
        locale: tenants.locale,
      })
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);
    
    if (tenant) {
      if (!tenant.active) {
        if (req.path.startsWith("/api/")) {
          return res.status(403).json({ message: "Tenant is inactive" });
        }
        return next();
      }
      req.tenant = tenant;
      return next();
    }

    // Not a company (tenant) subdomain. It may be an EMPRESA (brand) subdomain,
    // e.g. "jmobil.nexxo.com.mx" → resolve to the parent company (Joper) and
    // attach the empresa so login works and branding reflects the brand.
    const resolved = await resolveEmpresaSubdomain(subdomain);
    if (resolved) {
      if (!resolved.tenant.active) {
        if (req.path.startsWith("/api/")) {
          return res.status(403).json({ message: "Tenant is inactive" });
        }
        return next();
      }
      req.tenant = resolved.tenant;
      req.empresa = resolved.empresa;
      return next();
    }

    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    return next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    next();
  }
}

// Resolve an EMPRESA (brand) subdomain to its parent company (tenant) + empresa
// context. Returns null when no active empresa matches. Lets brand subdomains
// like "jmobil.nexxo.com.mx" log in against the parent company (e.g. Joper)
// while displaying the brand's own name, colors and logo.
async function resolveEmpresaSubdomain(
  subdomain: string,
): Promise<{ tenant: TenantContext; empresa: EmpresaContext } | null> {
  const [empresa] = await db
    .select({
      id: empresas.id,
      tenantId: empresas.tenantId,
      name: empresas.name,
      logoUrl: empresas.logoUrl,
      primaryColor: empresas.primaryColor,
      secondaryColor: empresas.secondaryColor,
      active: empresas.active,
    })
    .from(empresas)
    .where(eq(empresas.subdomain, subdomain))
    .limit(1);

  if (!empresa || !empresa.active) return null;

  const tenant = await getTenantById(empresa.tenantId);
  if (!tenant) return null;

  return {
    tenant,
    empresa: {
      id: empresa.id,
      tenantId: empresa.tenantId,
      name: empresa.name,
      logoUrl: empresa.logoUrl,
      primaryColor: empresa.primaryColor,
      secondaryColor: empresa.secondaryColor,
    },
  };
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant) {
    return res.status(400).json({ message: "Tenant context required" });
  }
  next();
}

// Returns the tenant IDs that a company can "see": itself plus every descendant
// company (children, grandchildren, ...). Used to validate that a company admin may
// switch into a given company. Uses a recursive CTE so multi-level hierarchies work.
export async function getAccessibleTenantIds(rootTenantId: string): Promise<string[]> {
  const result: any = await db.execute(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM tenants WHERE id = ${rootTenantId}
      UNION ALL
      SELECT t.id FROM tenants t
      INNER JOIN descendants d ON t.parent_id = d.id
    )
    SELECT id FROM descendants
  `);
  const rows = (result?.rows ?? result) as Array<{ id: string }>;
  return rows.map((r) => r.id);
}

// Fetch a full tenant context by id (used when a company admin switches into a child).
export async function getTenantById(id: string): Promise<TenantContext | null> {
  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      logoUrl: tenants.logoUrl,
      primaryColor: tenants.primaryColor,
      secondaryColor: tenants.secondaryColor,
      active: tenants.active,
      timezone: tenants.timezone,
      locale: tenants.locale,
    })
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);

  return tenant || null;
}

export async function getTenantBySubdomain(subdomain: string): Promise<TenantContext | null> {
  const [tenant] = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
      logoUrl: tenants.logoUrl,
      primaryColor: tenants.primaryColor,
      secondaryColor: tenants.secondaryColor,
      active: tenants.active,
      timezone: tenants.timezone,
      locale: tenants.locale,
    })
    .from(tenants)
    .where(eq(tenants.subdomain, subdomain))
    .limit(1);
  
  return tenant || null;
}
