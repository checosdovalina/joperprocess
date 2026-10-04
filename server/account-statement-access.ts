import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { tenants, UserRole } from "@shared/schema";

const statementManagementRoles: string[] = [
  UserRole.ADMIN, UserRole.CREDITO_COBRANZA, UserRole.FACTURACION,
];

// Used ONLY by the summary and PDF endpoints. Sending, recipient settings,
// schedules, and signed links retain their existing management-role guards.
export const requireAccountStatementReadAccess: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.sendStatus(401);
    return;
  }
  if (statementManagementRoles.includes(req.user.role)) {
    next();
    return;
  }
  const tenantId = req.tenant?.id ?? req.user.tenantId;
  if (
    req.user.role !== UserRole.VENDEDOR ||
    !req.user.active ||
    !tenantId ||
    tenantId !== req.user.tenantId
  ) {
    res.sendStatus(403);
    return;
  }
  try {
    // Read on every request: disabling the option revokes access immediately,
    // including when the statement data itself is served from cache.
    const [company] = await db.select({
      allowed: tenants.sellerCanDownloadStatements,
      active: tenants.active,
    }).from(tenants).where(eq(tenants.id, tenantId));
    if (!company?.active || !company.allowed) {
      res.sendStatus(403);
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
};