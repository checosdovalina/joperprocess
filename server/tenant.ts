import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { tenants } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface TenantContext {
  id: string;
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  active: boolean;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

const BASE_DOMAIN = "nexxo.com.mx";
const DEV_DOMAINS = ["localhost", "127.0.0.1", "0.0.0.0"];

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  const hostname = req.hostname || req.headers.host?.split(":")[0] || "";
  
  let subdomain: string | null = null;
  
  if (DEV_DOMAINS.some(d => hostname.includes(d))) {
    const querySubdomain = req.query.tenant as string | undefined;
    const headerSubdomain = req.headers["x-tenant-subdomain"] as string | undefined;
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
    const [tenant] = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
        logoUrl: tenants.logoUrl,
        primaryColor: tenants.primaryColor,
        secondaryColor: tenants.secondaryColor,
        active: tenants.active,
      })
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);
    
    if (!tenant) {
      if (req.path.startsWith("/api/")) {
        return res.status(404).json({ message: "Tenant not found" });
      }
      return next();
    }
    
    if (!tenant.active) {
      if (req.path.startsWith("/api/")) {
        return res.status(403).json({ message: "Tenant is inactive" });
      }
      return next();
    }
    
    req.tenant = tenant;
    next();
  } catch (error) {
    console.error("Tenant middleware error:", error);
    next();
  }
}

export function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant) {
    return res.status(400).json({ message: "Tenant context required" });
  }
  next();
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
    })
    .from(tenants)
    .where(eq(tenants.subdomain, subdomain))
    .limit(1);
  
  return tenant || null;
}
