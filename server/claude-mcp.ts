import { and, desc, eq, ilike } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { Express, NextFunction, Request, Response } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod/v4";
import {
  MeetingType,
  FollowUpStatus,
  ScheduledVisitStatus,
  UserRole,
  checkinUpdates,
  checkins,
  customers,
  scheduledVisits,
  tenants,
  users,
} from "@shared/schema";
import { db } from "./db";
import { generateMinutePDFStream } from "./pdf-generator";
import { localStorageService } from "./localStorage";
import { ObjectStorageService } from "./objectStorage";
import { sendCheckoutEmail } from "./email-service";
import {
  claudeOAuthProvider,
  getClaudeMcpRequestOrigin,
  MCP_SCOPES,
  registerClaudeMcpOAuthRoutes,
} from "./claude-mcp-oauth";
import { getAccessibleTenantIds } from "./tenant";

type TenantRequest = Request & {
  tenant?: { id: string };
  empresa?: { id: string };
  auth?: {
    clientId: string;
    scopes: string[];
    resource?: URL;
    extra?: Record<string, unknown>;
  };
};

type McpUser = typeof users.$inferSelect;
type McpCustomer = typeof customers.$inferSelect;
type McpCheckin = typeof checkins.$inferSelect;

class McpActionError extends Error {}
class McpActionReplay extends Error {}

function jsonResult(value: unknown, isError = false) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    ...(isError ? { isError: true } : {}),
  };
}

function isPrivileged(user: McpUser): boolean {
  return user.isSuperAdmin || user.role === UserRole.ADMIN;
}

// Match the application's check-in permission rule: administrators can access
// the tenant's records, vendors their assigned check-ins, and other roles only
// records they created.
export function canAccessMcpCheckin(user: McpUser, checkin: Pick<McpCheckin, "userId" | "salesPersonId">): boolean {
  if (isPrivileged(user)) return true;
  if (user.role === UserRole.VENDEDOR) {
    return (checkin.salesPersonId ?? checkin.userId) === user.id;
  }
  return checkin.userId === user.id;
}

function emailList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/[;,]/)
    .map((email) => email.trim().toLowerCase())
    .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
}

function requireScope(scopes: string[], scope: string): void {
  if (!scopes.includes(scope)) {
    throw new McpActionError(`Falta el permiso ${scope}. Desconecta y vuelve a conectar Claude para autorizarlo.`);
  }
}

export function createMcpActionRequestKey(clientId: string, userId: string, requestId: string | number): string {
  return createHash("sha256")
    .update(`${clientId}:${userId}:${String(requestId)}`)
    .digest("hex");
}

async function accessibleCustomers(user: McpUser, tenantId: string, query: string) {
  const rows = await db.select({
    id: customers.id,
    name: customers.name,
    contactName: customers.contactName,
    city: customers.city,
  }).from(customers).where(and(
    eq(customers.tenantId, tenantId),
    ilike(customers.name, `%${query}%`),
  )).orderBy(customers.name).limit(40);

  if (isPrivileged(user)) return rows.slice(0, 20);

  const ownedRows = await db.select({
    customerId: checkins.customerId,
    userId: checkins.userId,
    salesPersonId: checkins.salesPersonId,
  }).from(checkins).where(eq(checkins.tenantId, tenantId));
  const visibleIds = new Set(ownedRows
    .filter((checkin) => canAccessMcpCheckin(user, checkin))
    .map((checkin) => checkin.customerId));
  return rows.filter((customer) =>
    visibleIds.has(customer.id),
  ).slice(0, 20);
}

async function visibleCheckins(user: McpUser, tenantId: string, customerId: string) {
  const rows = await db.select().from(checkins).where(and(
    eq(checkins.tenantId, tenantId),
    eq(checkins.customerId, customerId),
    eq(checkins.followUpStatus, FollowUpStatus.OPEN),
  )).orderBy(desc(checkins.checkinAt)).limit(30);
  return rows.filter((checkin) => canAccessMcpCheckin(user, checkin));
}

export const registerContactInputSchema = z.object({
  customerId: z.string().min(1).max(100),
  checkinId: z.string().min(1).max(100).optional(),
  meetingType: z.enum([MeetingType.LLAMADA, MeetingType.VISITA, MeetingType.VIDEOLLAMADA]).default(MeetingType.LLAMADA),
  agreements: z.string().trim().max(3000).optional(),
  customerCommitment: z.string().trim().max(2000).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
  sendEmail: z.boolean().default(false),
  followUp: z.object({
    scheduledDate: z.string().datetime({ offset: true }),
    topics: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
    notes: z.string().trim().max(1500).optional(),
    reminderMinutes: z.union([z.literal(0), z.literal(60), z.literal(1440)]).default(0),
  }).optional(),
});

function registerTools(server: McpServer, user: McpUser, tenantId: string, scopes: string[], clientId: string): void {
  server.registerTool("buscar_clientes", {
    title: "Buscar clientes",
    description: "Busca clientes de tu empresa. Usa el ID devuelto para consultar sus check-ins o registrar una llamada.",
    inputSchema: { nombre: z.string().trim().min(2).max(100) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ nombre }) => {
    try {
      const matches = await accessibleCustomers(user, tenantId, nombre);
      return jsonResult(matches.map(({ id, name, contactName, city }) => ({
        customerId: id,
        cliente: name,
        contacto: contactName,
        ciudad: city,
      })));
    } catch (error) {
      return jsonResult({ error: error instanceof Error ? error.message : "No se pudo buscar clientes" }, true);
    }
  });

  server.registerTool("buscar_checkins", {
    title: "Consultar check-ins",
    description: "Consulta los seguimientos abiertos del cliente y devuelve sus IDs para registrar una llamada en el correcto.",
    inputSchema: { customerId: z.string().min(1).max(100) },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async ({ customerId }) => {
    try {
      const [customer] = await db.select({ id: customers.id, name: customers.name })
        .from(customers).where(and(
          eq(customers.id, customerId),
          eq(customers.tenantId, tenantId),
        )).limit(1);
      if (!customer) throw new McpActionError("Cliente no encontrado en esta empresa.");
      const rows = await visibleCheckins(user, tenantId, customer.id);
      return jsonResult({
        cliente: customer.name,
        checkins: rows.map((row) => ({
          checkinId: row.id,
          fecha: row.checkinAt.toISOString(),
          tipo: row.meetingType,
          estado: row.followUpStatus,
          vendedorId: row.salesPersonId ?? row.userId,
        })),
      });
    } catch (error) {
      return jsonResult({ error: error instanceof Error ? error.message : "No se pudieron consultar los check-ins" }, true);
    }
  });

  server.registerTool("registrar_contacto", {
    title: "Registrar llamada o contacto",
    description: "Registra un contacto en el seguimiento abierto. Si no existe uno, crea un check-in de llamada para el cliente. Nunca cierra el seguimiento. El correo se envía solo si sendEmail es true. Solo crea un seguimiento futuro si proporcionas scheduledDate con fecha y hora explícitas.",
    inputSchema: registerContactInputSchema.shape,
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (input, extra) => {
    try {
      requireScope(scopes, "checkins:write");
      if (input.sendEmail) requireScope(scopes, "email:send");
      if (input.followUp) requireScope(scopes, "visits:schedule");
      const sourceRequestId = createMcpActionRequestKey(clientId, user.id, extra.requestId);

      const eventAt = new Date();
      const scheduledDate = input.followUp ? new Date(input.followUp.scheduledDate) : null;
      if (scheduledDate && (!Number.isFinite(scheduledDate.getTime()) || scheduledDate <= eventAt)) {
        throw new McpActionError("La fecha de seguimiento debe ser futura e incluir una hora y zona horaria.");
      }

      type SavedContact = {
        customer: McpCustomer;
        checkin: McpCheckin;
        update: typeof checkinUpdates.$inferSelect;
        agreementText: string | null;
        scheduled: typeof scheduledVisits.$inferSelect | null;
        reminderDisabled: boolean;
      };
      let result: SavedContact;
      try {
        result = await db.transaction(async (tx) => {
        const [replayed] = await tx.select({
          id: checkinUpdates.id,
          checkinId: checkinUpdates.checkinId,
        }).from(checkinUpdates).where(and(
          eq(checkinUpdates.tenantId, tenantId),
          eq(checkinUpdates.userId, user.id),
          eq(checkinUpdates.sourceRequestId, sourceRequestId),
        )).limit(1);
        if (replayed) throw new McpActionReplay("This MCP request was already processed");

        const [customer] = await tx.select().from(customers).where(and(
          eq(customers.id, input.customerId),
          eq(customers.tenantId, tenantId),
        )).limit(1);
        if (!customer) throw new McpActionError("Cliente no encontrado en esta empresa.");
        if (!isPrivileged(user)) {
          const previous = await tx.select().from(checkins).where(and(
            eq(checkins.tenantId, tenantId),
            eq(checkins.customerId, customer.id),
          ));
          const hasAccessibleCheckin = previous.some((row) => canAccessMcpCheckin(user, row));
          if (!hasAccessibleCheckin) {
            throw new McpActionError("No tienes asignado este cliente.");
          }
        }

        const openRows = await tx.select().from(checkins).where(and(
          eq(checkins.tenantId, tenantId),
          eq(checkins.customerId, customer.id),
          eq(checkins.followUpStatus, FollowUpStatus.OPEN),
        )).orderBy(desc(checkins.checkinAt));
        const available = openRows.filter((row) => canAccessMcpCheckin(user, row));
        let checkin: McpCheckin;
        if (input.checkinId) {
          const selected = available.find((row) => row.id === input.checkinId);
          if (!selected) throw new McpActionError("El check-in indicado no está abierto, no corresponde al cliente o no tienes permiso.");
          checkin = selected;
        } else if (available.length === 1) {
          checkin = available[0];
        } else if (available.length > 1) {
          throw new McpActionError(`Hay varios seguimientos abiertos para este cliente. Pide al usuario que elija uno con buscar_checkins; IDs: ${available.slice(0, 10).map((row) => row.id).join(", ")}`);
        } else {
          if (![UserRole.ADMIN, UserRole.VENDEDOR, UserRole.VENTAS_LOGISTICA].includes(user.role as typeof UserRole.ADMIN)) {
            throw new McpActionError("Tu rol no puede iniciar un check-in de llamada para este cliente.");
          }
          const [created] = await tx.insert(checkins).values({
            tenantId,
            userId: user.id,
            salesPersonId: user.id,
            customerId: customer.id,
            meetingType: input.meetingType,
            checkinAt: eventAt,
            followUpStatus: FollowUpStatus.OPEN,
            topics: [],
            photos: [],
          }).returning();
          if (!created) throw new McpActionError("No se pudo iniciar el check-in de llamada.");
          checkin = created;
        }

        const agreementParts = [
          input.agreements ? `Acuerdo: ${input.agreements}` : "",
          input.customerCommitment ? `Compromiso del cliente: ${input.customerCommitment}` : "",
        ].filter(Boolean);
        const agreementText = agreementParts.join("\n") || null;
        const [update] = await tx.insert(checkinUpdates).values({
          tenantId,
          checkinId: checkin.id,
          userId: user.id,
          meetingType: input.meetingType,
          agreements: agreementText,
          internalNotes: input.internalNotes || null,
          photos: [],
          sourceRequestId,
          createdAt: eventAt,
        }).onConflictDoNothing().returning();
        if (!update) throw new McpActionError("No se pudo guardar el contacto.");

        let scheduled: typeof scheduledVisits.$inferSelect | null = null;
        let reminderDisabled = false;
        if (input.followUp && scheduledDate) {
          const sellerId = checkin.salesPersonId ?? checkin.userId;
          const seller = await tx.query.users.findFirst({
            where: and(
              eq(users.id, sellerId),
              eq(users.tenantId, tenantId),
              eq(users.active, true),
            ),
          });
          if (!seller) throw new McpActionError("No se encontró al vendedor asignado para el seguimiento.");
          reminderDisabled = input.followUp.reminderMinutes > 0 && seller.receiveEmailNotifications === false;
          const [visit] = await tx.insert(scheduledVisits).values({
            tenantId,
            userId: user.id,
            salesPersonId: sellerId,
            customerId: customer.id,
            meetingType: input.meetingType,
            scheduledDate,
            topics: input.followUp.topics,
            notes: input.followUp.notes ?? input.customerCommitment ?? input.agreements ?? null,
            status: ScheduledVisitStatus.SCHEDULED,
            reminderMinutes: reminderDisabled ? 0 : input.followUp.reminderMinutes,
          }).returning();
          scheduled = visit ?? null;
        }

        return { customer, checkin, update, agreementText, scheduled, reminderDisabled };
        });
      } catch (error) {
        if (!(error instanceof McpActionReplay)) throw error;
        const [existing] = await db.select({
          id: checkinUpdates.id,
          checkinId: checkinUpdates.checkinId,
        }).from(checkinUpdates).where(and(
          eq(checkinUpdates.tenantId, tenantId),
          eq(checkinUpdates.userId, user.id),
          eq(checkinUpdates.sourceRequestId, sourceRequestId),
        )).limit(1);
        if (!existing) throw error;
        return jsonResult({
          registrado: true,
          duplicado: true,
          contactoId: existing.id,
          checkinId: existing.checkinId,
          correoReenviado: false,
          seguimientoDuplicado: false,
        });
      }

      let pdfPath: string | null = null;
      let pdfError: string | null = null;
      const seller = await db.query.users.findFirst({
        where: and(
          eq(users.id, result.checkin.salesPersonId ?? result.checkin.userId),
          eq(users.tenantId, tenantId),
          eq(users.active, true),
        ),
      });
      const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
      if (seller && tenant) {
        try {
          const pdfStream = await generateMinutePDFStream({
            checkin: {
              ...result.checkin,
              checkinAt: eventAt,
              checkoutAt: eventAt,
              meetingType: input.meetingType,
              photos: [],
            },
            customer: result.customer,
            user: seller,
            checkoutNotes: result.agreementText ?? undefined,
            tenant,
          });
          pdfPath = process.env.USE_LOCAL_STORAGE === "true" ||
            process.env.NODE_ENV !== "production" ||
            (process.env.NODE_ENV === "production" && !process.env.PRIVATE_OBJECT_DIR)
            ? await localStorageService.uploadPdfStreamToStorage(pdfStream, result.update.id, user.id)
            : await new ObjectStorageService().uploadPdfStreamToStorage(pdfStream, result.update.id, user.id);
          await db.update(checkinUpdates).set({ minutePdfPath: pdfPath })
            .where(and(eq(checkinUpdates.id, result.update.id), eq(checkinUpdates.tenantId, tenantId)));
          await db.update(checkins).set({ minutePdfPath: pdfPath })
            .where(and(eq(checkins.id, result.checkin.id), eq(checkins.tenantId, tenantId)));
        } catch (error) {
          pdfError = error instanceof Error ? error.message : "No se pudo generar la minuta";
          console.error("[ClaudeMCP] Check-in PDF generation failed:", error);
        }
      } else {
        pdfError = "No se encontró el vendedor o la empresa para generar la minuta";
      }

      let email: { status: string; sent: string[]; failed?: Array<{ email: string; error: string }> } | null = null;
      if (input.sendEmail) {
        if (!pdfPath) {
          email = { status: "failed", sent: [], failed: [{ email: "", error: pdfError ?? "No se generó la minuta" }] };
        } else {
          const adminRows = await db.select({
            email: users.email,
          }).from(users).where(and(
            eq(users.tenantId, tenantId),
            eq(users.role, UserRole.ADMIN),
            eq(users.active, true),
            eq(users.receiveEmailNotifications, true),
          ));
          const recipientSet = new Set<string>();
          if (seller?.receiveEmailNotifications !== false) {
            emailList(seller?.email).forEach((address) => recipientSet.add(address));
          }
          emailList(result.customer.email).forEach((address) => recipientSet.add(address));
          adminRows.forEach((row) => emailList(row.email).forEach((address) => recipientSet.add(address)));
          try {
            const delivery = await sendCheckoutEmail({
              to: [...recipientSet],
              tenantName: tenant?.name || "NEXXO",
              checkinData: {
                customerName: result.customer.name,
                vendedorName: seller?.fullName || seller?.username || "Vendedor",
                checkoutDate: eventAt.toLocaleString("es-MX", { dateStyle: "full", timeStyle: "short" }),
                notes: result.agreementText ?? undefined,
              },
              pdfPath,
            });
            email = delivery;
          } catch (error) {
            email = {
              status: "failed",
              sent: [],
              failed: [{
                email: "",
                error: error instanceof Error ? error.message : "No se pudo enviar el correo",
              }],
            };
          }
        }
      }

      return jsonResult({
        registrado: true,
        cliente: result.customer.name,
        checkinId: result.checkin.id,
        contactoId: result.update.id,
        seguimientoPermaneceAbierto: true,
        minutaGenerada: Boolean(pdfPath),
        ...(pdfError ? { errorMinuta: pdfError } : {}),
        ...(input.sendEmail ? { correo: email } : {}),
        ...(result.scheduled ? {
          seguimientoProgramado: {
            id: result.scheduled.id,
            fecha: result.scheduled.scheduledDate.toISOString(),
            recordatorioMinutos: result.scheduled.reminderMinutes,
            ...(result.reminderDisabled ? { aviso: "El vendedor desactivó los recordatorios por correo; la visita quedó programada sin correo." } : {}),
          },
        } : {}),
      });
    } catch (error) {
      return jsonResult({ error: error instanceof Error ? error.message : "No se pudo registrar el contacto" }, true);
    }
  });
}

async function serveMcp(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const auth = req.auth;
    const extra = auth?.extra;
    const userId = typeof extra?.userId === "string" ? extra.userId : "";
    const tenantId = typeof extra?.tenantId === "string" ? extra.tenantId : "";
    const empresaId = typeof extra?.empresaId === "string" ? extra.empresaId : null;
    const origin = getClaudeMcpRequestOrigin(req);
    if (!auth || !userId || !tenantId || !origin ||
        auth.resource?.toString() !== `${origin}/mcp` ||
        req.tenant?.id !== tenantId ||
        (req.empresa?.id ?? null) !== empresaId) {
      res.status(403).json({ error: "El token no pertenece a esta empresa o a este recurso." });
      return;
    }

    const [user] = await db.select().from(users).where(and(
      eq(users.id, userId),
      eq(users.active, true),
    )).limit(1);
    const [tenant] = await db.select({ id: tenants.id, active: tenants.active })
      .from(tenants).where(eq(tenants.id, tenantId)).limit(1);
    const canUseTenant = user && (user.isSuperAdmin ||
      user.tenantId === tenantId ||
      (user.role === UserRole.ADMIN && user.tenantId != null &&
        (await getAccessibleTenantIds(user.tenantId)).includes(tenantId)));
    if (!user || !canUseTenant || !tenant?.active) {
      res.status(403).json({ error: "La cuenta o empresa está inactiva." });
      return;
    }

    const server = new McpServer({ name: "NEXXO Check-ins", version: "1.0.0" });
    registerTools(server, user, tenantId, auth.scopes, auth.clientId);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    next(error);
  }
}

export function registerClaudeMcpRoutes(app: Express): void {
  registerClaudeMcpOAuthRoutes(app);
  app.all("/mcp", (req: Request, res: Response, next: NextFunction) => {
    const origin = getClaudeMcpRequestOrigin(req);
    if (!origin || !(req as TenantRequest).tenant?.id) {
      res.status(404).json({ error: "El conector solo está disponible en un subdominio seguro de empresa." });
      return;
    }
    const authMiddleware = requireBearerAuth({
      verifier: claudeOAuthProvider,
      requiredScopes: ["checkins:read"],
      resourceMetadataUrl: `${origin}/.well-known/oauth-protected-resource/mcp`,
    });
    authMiddleware(req, res, (error?: unknown) => {
      if (error) return next(error);
      void serveMcp(req as TenantRequest, res, next);
    });
  });
}
