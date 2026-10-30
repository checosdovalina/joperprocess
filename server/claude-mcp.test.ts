import { describe, expect, it } from "vitest";
import type { Request } from "express";
import { UserRole } from "@shared/schema";
import { canAccessMcpCheckin, createMcpActionRequestKey, registerContactInputSchema } from "./claude-mcp";
import { getClaudeMcpRequestOrigin, isAllowedClaudeRedirectUri } from "./claude-mcp-oauth";

function user(role: string, id: string, isSuperAdmin = false) {
  return {
    id,
    role,
    isSuperAdmin,
  } as Parameters<typeof canAccessMcpCheckin>[0];
}

function request(host: string, secure: boolean, forwardedProto?: string): Request {
  return {
    get(name: string) {
      if (name.toLowerCase() === "host") return host;
      if (name.toLowerCase() === "x-forwarded-proto") return forwardedProto;
      return undefined;
    },
    secure,
  } as unknown as Request;
}

describe("Claude MCP connector security", () => {
  it("recognizes a retried action without conflating different users or actions", () => {
    const key = createMcpActionRequestKey("client", "user", 1, { agreements: "A" });
    expect(createMcpActionRequestKey("client", "user", 1, { agreements: "A" })).toBe(key);
    expect(createMcpActionRequestKey("client", "other", 1, { agreements: "A" })).not.toBe(key);
    expect(createMcpActionRequestKey("client", "user", 1, { agreements: "B" })).not.toBe(key);
  });
  it("only accepts Claude's HTTPS callback or a loopback callback", () => {
    expect(isAllowedClaudeRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedClaudeRedirectUri("http://127.0.0.1:43123/oauth/callback")).toBe(true);
    expect(isAllowedClaudeRedirectUri("https://claude.ai.attacker.test/api/mcp/auth_callback")).toBe(false);
    expect(isAllowedClaudeRedirectUri("http://attacker.test/api/mcp/auth_callback")).toBe(false);
    expect(isAllowedClaudeRedirectUri("https://claude.ai/other")).toBe(false);
  });

  it("requires HTTPS and a trusted host for the public connector origin", () => {
    expect(getClaudeMcpRequestOrigin(request("agroesa.nexxo.com.mx", true))).toBe("https://agroesa.nexxo.com.mx");
    expect(getClaudeMcpRequestOrigin(request("agroesa.nexxo.com.mx", false))).toBeNull();
    expect(getClaudeMcpRequestOrigin(request("attacker.test", true))).toBeNull();
    expect(getClaudeMcpRequestOrigin(request("joper.nexxo.com.mx", false, "https"))).toBe("https://joper.nexxo.com.mx");
  });

  it("restricts sellers to their assigned records and leaves admin access tenant-scoped", () => {
    const checkin = { userId: "owner", salesPersonId: "seller" };
    expect(canAccessMcpCheckin(user(UserRole.VENDEDOR, "seller"), checkin)).toBe(true);
    expect(canAccessMcpCheckin(user(UserRole.VENDEDOR, "other"), checkin)).toBe(false);
    expect(canAccessMcpCheckin(user(UserRole.ADMIN, "admin"), checkin)).toBe(true);
  });

  it("defaults to no email and no follow-up unless those actions are requested", () => {
    const input = registerContactInputSchema.parse({ customerId: "customer-1" });
    expect(input.sendEmail).toBe(false);
    expect(input.followUp).toBeUndefined();
    expect(input.meetingType).toBe("llamada");
  });

  it("requires a timezone-qualified future date format for a follow-up request", () => {
    const invalid = registerContactInputSchema.safeParse({
      customerId: "customer-1",
      followUp: { scheduledDate: "2026-10-30 10:00" },
    });
    expect(invalid.success).toBe(false);
  });
});
