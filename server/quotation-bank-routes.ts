import type { Express, Request } from "express";
import { eq } from "drizzle-orm";
import { tenants, UserRole } from "@shared/schema";
import { emptyQuotationBankDetails, quotationBankDetailsSchema } from "@shared/quotation-bank-settings";
import { isAuthenticated, hasRole } from "./auth";
import { db } from "./db";
import { getQuotationBankDetails } from "./quotation-bank-details";

export function registerQuotationBankRoutes(app: Express, tenantIdFor: (req: Request) => string | null) {
  const path = "/api/company-settings/bank-details";
  for (const method of ["get", "put", "delete"] as const) {
    app[method](path, isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
      try {
        // The active company comes only from authenticated server context, never the payload.
        const tenantId = tenantIdFor(req);
        if (!tenantId) return res.status(400).json({ error: "No hay una compañía seleccionada" });
        if (method === "get") {
          const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
          if (!tenant) return res.sendStatus(404);
          return res.json(tenant.quotationBankDetails ?? getQuotationBankDetails(tenant) ?? emptyQuotationBankDetails());
        }
        const parsed = quotationBankDetailsSchema.safeParse(
          method === "delete" ? emptyQuotationBankDetails() : req.body,
        );
        if (!parsed.success) return res.status(400).json({
          error: parsed.error.issues.map(issue => issue.message).join(". "),
        });
        const [updated] = await db.update(tenants).set({
          quotationBankDetails: parsed.data, updatedAt: new Date(),
        }).where(eq(tenants.id, tenantId)).returning({ details: tenants.quotationBankDetails });
        if (!updated) return res.sendStatus(404);
        return res.json(updated.details);
      } catch {
        // Never log request bodies or bank identifiers.
        res.status(500).json({ error: "No se pudieron procesar los datos bancarios" });
      }
    });
  }
}
