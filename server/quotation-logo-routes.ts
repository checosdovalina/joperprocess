import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { tenants, UserRole } from "@shared/schema";
import { isAgroesaQuotation, quotationLogoSlots } from "@shared/quotation-branding";
import { isAuthenticated, hasRole } from "./auth";
import { db } from "./db";
import { localStorageService } from "./localStorage";
import { MAX_PRODUCT_IMAGE_BYTES, getProductImageExtension } from "./product-images";

export function registerQuotationLogoRoutes(app: Express, tenantIdFor: (req: Request) => string | null) {
  async function context(req: Request, res: Response) {
    const slot = req.params.slot as keyof typeof quotationLogoSlots;
    if (!Object.hasOwn(quotationLogoSlots, slot)) {
      res.status(400).json({ error: "Marca de cotización inválida" });
      return null;
    }
    const tenantId = tenantIdFor(req);
    if (!tenantId) {
      res.status(400).json({ error: "No hay una compañía seleccionada" });
      return null;
    }
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant) {
      res.sendStatus(404);
      return null;
    }
    if (!isAgroesaQuotation(tenant)) {
      res.status(403).json({ error: "Los logos adicionales están habilitados únicamente para Agroesa" });
      return null;
    }
    return { tenantId, slot, field: quotationLogoSlots[slot].field };
  }

  app.post("/api/company-settings/quotation-logos/:slot", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const ctx = await context(req, res);
      if (!ctx) return;
      const mime = (req.headers["content-type"] || "").split(";")[0].toLowerCase().trim();
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(mime)) {
        return res.status(400).json({ error: "Selecciona una imagen JPG, PNG, WEBP o GIF" });
      }
      if (Number(req.headers["content-length"] || 0) > MAX_PRODUCT_IMAGE_BYTES) {
        return res.status(413).json({ error: "La imagen no puede superar 5 MB" });
      }
      const chunks: Buffer[] = [];
      let size = 0;
      for await (const chunk of req) {
        const buffer = Buffer.from(chunk);
        size += buffer.length;
        if (size > MAX_PRODUCT_IMAGE_BYTES) return res.status(413).json({ error: "La imagen no puede superar 5 MB" });
        chunks.push(buffer);
      }
      const input = Buffer.concat(chunks);
      if (!getProductImageExtension(input, mime)) return res.status(400).json({ error: "El archivo no es una imagen válida" });
      let normalized: Buffer;
      try {
        normalized = await sharp(input, { limitInputPixels: 16_000_000 })
          .rotate().flatten({ background: "#ffffff" }).trim({ background: "#ffffff", threshold: 12 })
          .resize({ width: 1000, height: 400, fit: "inside", withoutEnlargement: true }).png().toBuffer();
      } catch {
        return res.status(400).json({ error: "No se pudo procesar la imagen. Verifica el archivo y sus dimensiones." });
      }
      const saved = await localStorageService.uploadLogo(normalized, `${ctx.tenantId}-quotation-${ctx.slot}-${randomUUID()}`, "png");
      const [tenant] = await db.update(tenants).set({
        [ctx.field]: `/api/logos/${saved.replace("logos/", "")}`, updatedAt: new Date(),
      }).where(eq(tenants.id, ctx.tenantId)).returning();
      res.json(tenant);
    } catch (error) {
      console.error("Error uploading quotation brand logo:", error);
      res.status(500).json({ error: "No se pudo guardar el logo de la marca" });
    }
  });

  app.delete("/api/company-settings/quotation-logos/:slot", isAuthenticated, hasRole(UserRole.ADMIN), async (req, res) => {
    try {
      const ctx = await context(req, res);
      if (!ctx) return;
      const [tenant] = await db.update(tenants).set({ [ctx.field]: "", updatedAt: new Date() })
        .where(eq(tenants.id, ctx.tenantId)).returning();
      res.json(tenant);
    } catch (error) {
      console.error("Error removing quotation brand logo:", error);
      res.status(500).json({ error: "No se pudo quitar el logo de la marca" });
    }
  });
}
