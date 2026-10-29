import { createHash, randomBytes } from "node:crypto";
import express, { type Express, type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { and, eq, gt, isNull, or } from "drizzle-orm";
import {
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import type {
  AuthorizationParams,
  OAuthServerProvider,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type {
  OAuthClientInformationFull,
  OAuthTokenRevocationRequest,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import { db } from "./db";
import {
  claudeMcpAuthorizations,
  claudeMcpClients,
  claudeMcpTokens,
  tenants,
  users,
} from "@shared/schema";
import { getAccessibleTenantIds } from "./tenant";

export const MCP_SCOPES = [
  "checkins:read",
  "checkins:write",
  "email:send",
  "visits:schedule",
] as const;

const DEFAULT_SCOPES = [...MCP_SCOPES];
const ACCESS_TOKEN_SECONDS = 60 * 60;
const REFRESH_TOKEN_SECONDS = 60 * 60 * 24 * 30;
const AUTHORIZATION_SECONDS = 10 * 60;
const MCP_RESOURCE_PATH = "/mcp";

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isAllowedClaudeRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri);
    if (parsed.search || parsed.hash) return false;
    if (parsed.protocol === "https:" &&
        (parsed.hostname === "claude.ai" || parsed.hostname === "claude.com") &&
        parsed.pathname === "/api/mcp/auth_callback") {
      return true;
    }
    return parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);
}

export function getClaudeMcpRequestOrigin(req: Request): string | null {
  const host = req.get("host")?.toLowerCase();
  if (!host || /[\s/@\\]/.test(host)) return null;

  const local = process.env.NODE_ENV !== "production" &&
    /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const trustedDomain = /^(?:[a-z0-9-]+\.)+nexxo\.com\.mx(?::\d+)?$/.test(host) ||
    /^(?:[a-z0-9-]+\.)+(?:replit\.dev|replit\.app)(?::\d+)?$/.test(host);
  if (!local && !trustedDomain) return null;

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = req.secure || forwardedProto === "https";
  if (!local && !secure) return null;
  return `${local && !secure ? "http" : "https"}://${host}`;
}

type RequestWithTenant = Request & {
  tenant?: { id: string };
  empresa?: { id: string };
  user?: { id: string; tenantId: string | null; active?: boolean; isSuperAdmin?: boolean; role?: string };
};

class ClaudeOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = {
    getClient: async (clientId: string): Promise<OAuthClientInformationFull | undefined> => {
      const [row] = await db.select().from(claudeMcpClients)
        .where(eq(claudeMcpClients.clientId, clientId)).limit(1);
      return row?.clientInfo;
    },
    registerClient: async (
      client: Omit<OAuthClientInformationFull, "client_id" | "client_id_issued_at">,
    ): Promise<OAuthClientInformationFull> => {
      if (client.token_endpoint_auth_method !== "none" ||
          !client.redirect_uris?.length ||
          client.redirect_uris.some((uri) => !isAllowedClaudeRedirectUri(uri))) {
        throw new Error("Only public Claude MCP clients using approved callback URLs are supported");
      }
      const publicClient = {
        ...client,
        token_endpoint_auth_method: "none" as const,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      };
      const clientInfo = client as OAuthClientInformationFull;
      const {
        client_secret: _clientSecret,
        client_secret_expires_at: _clientSecretExpiresAt,
        ...publicClientInfo
      } = clientInfo;
      const storedInfo = {
        ...publicClient,
        ...publicClientInfo,
        token_endpoint_auth_method: "none" as const,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
      };
      const [row] = await db.insert(claudeMcpClients).values({
        clientId: clientInfo.client_id,
        clientInfo: storedInfo,
      }).returning();
      if (!row) throw new Error("Unable to register MCP client");
      return row.clientInfo;
    },
  };

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response,
  ): Promise<void> {
    const req = (res as Response & { req: RequestWithTenant }).req;
    const origin = getClaudeMcpRequestOrigin(req);
    const tenantId = req.tenant?.id;
    if (!origin || !tenantId || client.redirect_uris.some((uri) => !isAllowedClaudeRedirectUri(uri))) {
      throw new Error("MCP OAuth requires a tenant subdomain with valid HTTPS and an approved Claude client");
    }

    const resource = params.resource;
    if (!resource || resource.origin !== origin || resource.pathname !== MCP_RESOURCE_PATH ||
        resource.search || resource.hash) {
      throw new Error("The requested MCP resource does not match this company host");
    }

    const requestedScopes = params.scopes?.length
      ? [...new Set(params.scopes.filter((scope) => MCP_SCOPES.includes(scope as typeof MCP_SCOPES[number])))]
      : DEFAULT_SCOPES;
    const id = createToken();
    await db.insert(claudeMcpAuthorizations).values({
      id,
      clientId: client.client_id,
      redirectUri: params.redirectUri,
      state: params.state ?? null,
      codeChallenge: params.codeChallenge,
      requestedScopes,
      resourceUrl: resource.toString(),
      tenantId,
      empresaId: req.empresa?.id ?? null,
      expiresAt: new Date(Date.now() + AUTHORIZATION_SECONDS * 1000),
    });
    res.redirect(303, `${origin}/mcp/consent?id=${encodeURIComponent(id)}`);
  }

  async challengeForAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
  ): Promise<string> {
    const [row] = await db.select().from(claudeMcpAuthorizations).where(and(
      eq(claudeMcpAuthorizations.authorizationCodeHash, tokenHash(authorizationCode)),
      eq(claudeMcpAuthorizations.clientId, client.client_id),
      isNull(claudeMcpAuthorizations.consumedAt),
      gt(claudeMcpAuthorizations.expiresAt, new Date()),
    )).limit(1);
    if (!row) throw new Error("Invalid or expired authorization code");
    return row.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string,
    codeVerifier?: string,
    redirectUri?: string,
    resource?: URL,
  ): Promise<OAuthTokens> {
    if (!codeVerifier || !/^[A-Za-z0-9._~-]{43,128}$/.test(codeVerifier)) {
      throw new Error("A valid PKCE verifier is required");
    }
    const codeHash = tokenHash(authorizationCode);
    const [candidate] = await db.select().from(claudeMcpAuthorizations).where(and(
      eq(claudeMcpAuthorizations.authorizationCodeHash, codeHash),
      eq(claudeMcpAuthorizations.clientId, client.client_id),
      isNull(claudeMcpAuthorizations.consumedAt),
      gt(claudeMcpAuthorizations.expiresAt, new Date()),
    )).limit(1);
    if (!candidate || candidate.redirectUri !== redirectUri ||
        candidate.resourceUrl !== resource?.toString() ||
        createHash("sha256").update(codeVerifier).digest("base64url") !== candidate.codeChallenge ||
        !candidate.userId || !candidate.grantedScopes) {
      throw new Error("Invalid or expired authorization code");
    }

    const user = await db.query.users.findFirst({
      where: and(eq(users.id, candidate.userId), eq(users.active, true)),
    });
    const tenant = await db.query.tenants.findFirst({
      where: and(eq(tenants.id, candidate.tenantId), eq(tenants.active, true)),
    });
    if (!user || !tenant) throw new Error("The authorizing account or company is no longer active");

    const [consumed] = await db.update(claudeMcpAuthorizations)
      .set({ consumedAt: new Date() })
      .where(and(
        eq(claudeMcpAuthorizations.id, candidate.id),
        isNull(claudeMcpAuthorizations.consumedAt),
        gt(claudeMcpAuthorizations.expiresAt, new Date()),
      ))
      .returning();
    if (!consumed) throw new Error("Authorization code has already been used");

    return this.issueTokens({
      clientId: client.client_id,
      userId: user.id,
      tenantId: candidate.tenantId,
      empresaId: candidate.empresaId,
      scopes: candidate.grantedScopes,
      resourceUrl: candidate.resourceUrl,
    });
  }

  async exchangeRefreshToken(
    client: OAuthClientInformationFull,
    refreshToken: string,
    scopes?: string[],
    resource?: URL,
  ): Promise<OAuthTokens> {
    const [row] = await db.select().from(claudeMcpTokens).where(and(
      eq(claudeMcpTokens.refreshTokenHash, tokenHash(refreshToken)),
      eq(claudeMcpTokens.clientId, client.client_id),
      isNull(claudeMcpTokens.revokedAt),
      gt(claudeMcpTokens.refreshExpiresAt, new Date()),
    )).limit(1);
    if (!row || row.resourceUrl !== resource?.toString()) {
      throw new Error("Invalid or expired refresh token");
    }
    const nextScopes = scopes?.length ? scopes : row.scopes;
    if (nextScopes.some((scope) => !row.scopes.includes(scope))) {
      throw new Error("Refresh cannot add OAuth scopes");
    }
    const [rotated] = await db.update(claudeMcpTokens)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(claudeMcpTokens.id, row.id),
        eq(claudeMcpTokens.refreshTokenHash, tokenHash(refreshToken)),
        isNull(claudeMcpTokens.revokedAt),
      ))
      .returning({ id: claudeMcpTokens.id });
    if (!rotated) throw new Error("Refresh token has already been used");
    return this.issueTokens({
      clientId: row.clientId,
      userId: row.userId,
      tenantId: row.tenantId,
      empresaId: row.empresaId,
      scopes: nextScopes,
      resourceUrl: row.resourceUrl,
    });
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const [row] = await db.select().from(claudeMcpTokens).where(and(
      eq(claudeMcpTokens.accessTokenHash, tokenHash(token)),
      isNull(claudeMcpTokens.revokedAt),
      gt(claudeMcpTokens.accessExpiresAt, new Date()),
    )).limit(1);
    if (!row) throw new Error("Invalid or expired access token");
    const user = await db.query.users.findFirst({
      where: and(eq(users.id, row.userId), eq(users.active, true)),
      columns: { id: true },
    });
    if (!user) throw new Error("The authorizing account is no longer active");
    return {
      token,
      clientId: row.clientId,
      scopes: row.scopes,
      expiresAt: Math.floor(row.accessExpiresAt.getTime() / 1000),
      resource: new URL(row.resourceUrl),
      extra: {
        userId: row.userId,
        tenantId: row.tenantId,
        empresaId: row.empresaId ?? null,
      },
    };
  }

  async revokeToken(
    client: OAuthClientInformationFull,
    request: OAuthTokenRevocationRequest,
  ): Promise<void> {
    const hash = tokenHash(request.token);
    await db.update(claudeMcpTokens).set({ revokedAt: new Date() }).where(and(
      eq(claudeMcpTokens.clientId, client.client_id),
      isNull(claudeMcpTokens.revokedAt),
      or(
        eq(claudeMcpTokens.accessTokenHash, hash),
        eq(claudeMcpTokens.refreshTokenHash, hash),
      ),
    ));
  }

  private async issueTokens(input: {
    clientId: string;
    userId: string;
    tenantId: string;
    empresaId: string | null;
    scopes: string[];
    resourceUrl: string;
  }): Promise<OAuthTokens> {
    const accessToken = createToken();
    const refreshToken = createToken();
    const now = Date.now();
    const accessExpiresAt = new Date(now + ACCESS_TOKEN_SECONDS * 1000);
    const refreshExpiresAt = new Date(now + REFRESH_TOKEN_SECONDS * 1000);
    await db.insert(claudeMcpTokens).values({
      ...input,
      accessTokenHash: tokenHash(accessToken),
      refreshTokenHash: tokenHash(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
    });
    return {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_SECONDS,
      refresh_token: refreshToken,
      scope: input.scopes.join(" "),
    };
  }
}

export const claudeOAuthProvider = new ClaudeOAuthProvider();

function sendHtml(res: Response, body: string): void {
  res.set({
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  res.send(body);
}

async function loadConsentRequest(req: RequestWithTenant, res: Response) {
  const id = typeof req.query.id === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(req.query.id)
    ? req.query.id
    : "";
  const [pending] = await db.select().from(claudeMcpAuthorizations).where(and(
    eq(claudeMcpAuthorizations.id, id),
    gt(claudeMcpAuthorizations.expiresAt, new Date()),
    isNull(claudeMcpAuthorizations.consumedAt),
  )).limit(1);
  const origin = getClaudeMcpRequestOrigin(req);
  if (!pending || !origin || pending.resourceUrl !== `${origin}${MCP_RESOURCE_PATH}` ||
      pending.tenantId !== req.tenant?.id ||
      (pending.empresaId ?? null) !== (req.empresa?.id ?? null)) {
    sendHtml(res.status(400), "<h1>Solicitud de conexión no válida o vencida</h1>");
    return null;
  }

  if (!req.user) {
    const returnTo = encodeURIComponent(req.originalUrl);
    res.redirect(303, `/auth?next=${returnTo}`);
    return null;
  }

  const [clientRow] = await db.select().from(claudeMcpClients)
    .where(eq(claudeMcpClients.clientId, pending.clientId)).limit(1);
  if (!clientRow) {
    sendHtml(res.status(400), "<h1>Aplicación de Claude no registrada</h1>");
    return null;
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, req.user.id), eq(users.active, true)),
  });
  if (!user) {
    sendHtml(res.status(403), "<h1>La cuenta está inactiva</h1>");
    return null;
  }

  const canUseTenant = user.isSuperAdmin ||
    user.tenantId === pending.tenantId ||
    (user.role === "admin" && user.tenantId != null &&
      (await getAccessibleTenantIds(user.tenantId)).includes(pending.tenantId));
  if (!canUseTenant) {
    sendHtml(res.status(403), "<h1>Esta cuenta no tiene acceso a la empresa solicitada</h1>");
    return null;
  }

  const csrf = randomBytes(32).toString("base64url");
  const session = req.session as typeof req.session & { mcpConsentCsrf?: Record<string, string> };
  const csrfByRequest = { ...(session.mcpConsentCsrf ?? {}), [pending.id]: csrf };
  const entries = Object.entries(csrfByRequest).slice(-10);
  session.mcpConsentCsrf = Object.fromEntries(entries);

  return { pending, client: clientRow.clientInfo, csrf, user };
}

export function registerClaudeMcpOAuthRoutes(app: Express): void {
  app.get("/mcp/consent", async (req: Request, res: Response) => {
    try {
      const consent = await loadConsentRequest(req as RequestWithTenant, res);
      if (!consent) return;
      const labels: Record<string, string> = {
        "checkins:read": "Consultar clientes y check-ins",
        "checkins:write": "Registrar llamadas y acuerdos",
        "email:send": "Enviar la minuta por correo cuando lo pidas",
        "visits:schedule": "Programar seguimientos y recordatorios",
      };
      const requested = new Set(consent.pending.requestedScopes);
      const options = MCP_SCOPES.filter((scope) => requested.has(scope)).map((scope) => {
        const optional = scope === "email:send" || scope === "visits:schedule";
        const checked = optional ? "" : " checked";
        return `<label style="display:flex;gap:10px;margin:14px 0"><input type="checkbox" name="scopes" value="${scope}"${checked}><span>${labels[scope]}</span></label>`;
      }).join("");
      const appName = escapeHtml(consent.client.client_name || "Claude");
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, consent.pending.tenantId),
        columns: { name: true },
      });
      const companyName = escapeHtml(tenant?.name || "tu empresa");
      const csrfField = escapeHtml(consent.csrf);
      const idField = escapeHtml(consent.pending.id);
      sendHtml(res, `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Conectar ${appName}</title><body style="font:16px system-ui;max-width:560px;margin:8vh auto;padding:24px;color:#172033"><h1>Conectar ${appName}</h1><p>Claude solicita acceso a ${companyName} con tu cuenta personal. El acceso respetará tus permisos de usuario y empresa.</p><form method="post" action="/mcp/consent"><input type="hidden" name="id" value="${idField}"><input type="hidden" name="csrf" value="${csrfField}">${options}<button name="decision" value="allow" style="padding:10px 18px">Autorizar selección</button> <button name="decision" value="deny" formnovalidate style="padding:10px 18px">Cancelar</button></form><p style="color:#5b6472;font-size:14px">Los correos y seguimientos requieren autorización adicional y solo se realizan si lo pides. Puedes revocar el acceso desde Claude.</p></body></html>`);
    } catch (error) {
      console.error("[ClaudeMCP] Consent page failed:", error);
      sendHtml(res.status(500), "<h1>No se pudo mostrar el permiso de conexión</h1>");
    }
  });

  app.post("/mcp/consent", express.urlencoded({ extended: false, limit: "16kb" }), async (req: Request, res: Response) => {
    try {
      const body = req.body as Record<string, unknown>;
      const id = typeof body.id === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(body.id) ? body.id : "";
      const [pending] = await db.select().from(claudeMcpAuthorizations).where(and(
        eq(claudeMcpAuthorizations.id, id),
        gt(claudeMcpAuthorizations.expiresAt, new Date()),
        isNull(claudeMcpAuthorizations.consumedAt),
      )).limit(1);
      const origin = getClaudeMcpRequestOrigin(req);
      const user = req.user;
      if (!pending || !origin || pending.resourceUrl !== `${origin}${MCP_RESOURCE_PATH}` ||
          pending.tenantId !== (req as RequestWithTenant).tenant?.id ||
          (pending.empresaId ?? null) !== ((req as RequestWithTenant).empresa?.id ?? null) || !user) {
        sendHtml(res.status(400), "<h1>Solicitud de permiso no válida o vencida</h1>");
        return;
      }

      const session = req.session as typeof req.session & { mcpConsentCsrf?: Record<string, string> };
      const csrf = session.mcpConsentCsrf?.[pending.id];
      const submittedCsrf = typeof body.csrf === "string" ? body.csrf : "";
      if (!csrf || csrf !== submittedCsrf) {
        sendHtml(res.status(403), "<h1>La sesión de autorización venció; vuelve a iniciar la conexión</h1>");
        return;
      }
      const csrfByRequest = { ...session.mcpConsentCsrf };
      delete csrfByRequest[pending.id];
      session.mcpConsentCsrf = csrfByRequest;

      const redirect = new URL(pending.redirectUri);
      if (body.decision !== "allow") {
        redirect.searchParams.set("error", "access_denied");
        if (pending.state) redirect.searchParams.set("state", pending.state);
        res.redirect(303, redirect.toString());
        return;
      }

      const requested = new Set(pending.requestedScopes);
      const submittedScopes = Array.isArray(body.scopes)
        ? body.scopes.filter((value): value is string => typeof value === "string")
        : typeof body.scopes === "string" ? [body.scopes] : [];
      const grantedScopes = [...new Set(submittedScopes)]
        .filter((scope) => requested.has(scope) && MCP_SCOPES.includes(scope as typeof MCP_SCOPES[number]));
      if (!grantedScopes.includes("checkins:read")) {
        sendHtml(res.status(400), "<h1>Para conectar Claude debes permitir la consulta de check-ins</h1>");
        return;
      }
      const dbUser = await db.query.users.findFirst({
        where: and(eq(users.id, user.id), eq(users.active, true)),
      });
      if (!dbUser) {
        sendHtml(res.status(403), "<h1>La cuenta está inactiva</h1>");
        return;
      }
      const canUseTenant = dbUser.isSuperAdmin ||
        dbUser.tenantId === pending.tenantId ||
        (dbUser.role === "admin" && dbUser.tenantId != null &&
          (await getAccessibleTenantIds(dbUser.tenantId)).includes(pending.tenantId));
      if (!canUseTenant) {
        sendHtml(res.status(403), "<h1>Esta cuenta no tiene acceso a la empresa solicitada</h1>");
        return;
      }

      const code = createToken();
      const codeHash = tokenHash(code);
      const [updated] = await db.update(claudeMcpAuthorizations).set({
        userId: dbUser.id,
        grantedScopes,
        authorizationCodeHash: codeHash,
      }).where(and(
        eq(claudeMcpAuthorizations.id, pending.id),
        isNull(claudeMcpAuthorizations.consumedAt),
        gt(claudeMcpAuthorizations.expiresAt, new Date()),
      )).returning({ id: claudeMcpAuthorizations.id });
      if (!updated) {
        sendHtml(res.status(409), "<h1>La solicitud ya se utilizó</h1>");
        return;
      }
      redirect.searchParams.set("code", code);
      if (pending.state) redirect.searchParams.set("state", pending.state);
      res.redirect(303, redirect.toString());
    } catch (error) {
      console.error("[ClaudeMCP] Consent submission failed:", error);
      sendHtml(res.status(500), "<h1>No se pudo completar la autorización</h1>");
    }
  });

  const authPaths = new Set([
    "/authorize",
    "/token",
    "/register",
    "/revoke",
    "/.well-known/oauth-authorization-server",
    "/.well-known/oauth-protected-resource",
    "/.well-known/oauth-protected-resource/mcp",
  ]);
  const routers = new Map<string, RequestHandler>();
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!authPaths.has(req.path)) return next();
    const origin = getClaudeMcpRequestOrigin(req);
    const tenantId = (req as RequestWithTenant).tenant?.id;
    if (!origin || !tenantId) {
      res.status(404).json({ error: "MCP connector is available only on a secure company subdomain" });
      return;
    }
    try {
      let router = routers.get(origin);
      if (!router) {
        router = mcpAuthRouter({
          provider: claudeOAuthProvider,
          issuerUrl: new URL(origin),
          resourceServerUrl: new URL(MCP_RESOURCE_PATH, origin),
          scopesSupported: [...MCP_SCOPES],
          resourceName: "NEXXO Check-ins",
        });
        routers.set(origin, router);
      }
      router(req, res, next);
    } catch (error) {
      next(error);
    }
  });
}
