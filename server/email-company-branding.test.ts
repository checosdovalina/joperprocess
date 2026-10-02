import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Customer, Invoice } from "@shared/schema";

const { sendEmail, getFile } = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  getFile: vi.fn(),
}));

// Capture the actual generated message without contacting the email provider.
vi.mock("mailersend", async importOriginal => {
  const actual = await importOriginal<typeof import("mailersend")>();
  return {
    ...actual,
    MailerSend: class {
      email = { send: sendEmail };
    },
  };
});
vi.mock("./localStorage", () => ({
  localStorageService: { getFile },
}));

import { sendCheckoutEmail } from "./email-service";
import { sendQuotationEmail } from "./quotation-email-service";
import { sendInvoiceEmail } from "./invoice-email-service";
import { sendScheduledVisitReminderEmail } from "./scheduled-visit-email-service";
import { companyEmailBranding } from "./email-branding";

beforeEach(() => {
  sendEmail.mockReset().mockResolvedValue({});
  getFile.mockReset().mockResolvedValue(Buffer.from("mock PDF attachment"));
  // Test-only placeholder; no real messages or credentials are used.
  vi.stubEnv("MAILERSEND_API_KEY", "mock-email-provider-key");
  vi.stubEnv("NODE_ENV", "test");
});
afterEach(() => vi.unstubAllEnvs());

function expectCompanyMessage(name: string, brandedSubject = false) {
  expect(sendEmail).toHaveBeenCalledTimes(1);
  const email = sendEmail.mock.calls[0][0];
  expect(email.from).toMatchObject({ email: "noreply@nexxo.com.mx", name });
  expect(email.html).toContain(companyEmailBranding(name).htmlName);
  expect(email.html).not.toContain("GRUPO JOPER");
  if (brandedSubject) expect(email.subject).toContain(name);
}

describe.each(["Compañía Norte", "Compañía Sur & Hijos <Sucursal>"])("emails for %s", tenantName => {
  it("brands visit minutes with their company", async () => {
    const result = await sendCheckoutEmail({
      tenantName,
      to: ["customer@example.test"],
      checkinData: { customerName: "Cliente", vendedorName: "Vendedor", checkoutDate: "2026-10-02" },
      pdfPath: "minutes/mock.pdf",
    });
    expect(result.status).toBe("sent");
    expectCompanyMessage(tenantName);
  });

  it("brands quotation sender, subject, header, and signature with their company", async () => {
    await sendQuotationEmail({
      tenantName,
      to: ["customer@example.test"],
      quotationData: {
        folio: "COT-001", customerName: "Cliente", vendedorName: "Vendedor",
        total: "1,000.00", currency: "MXN", itemsCount: 1,
      },
      pdfPath: "quotations/mock.pdf",
    });
    expectCompanyMessage(tenantName, true);
  });

  it("brands invoice sender, subject, and content with their company", async () => {
    await sendInvoiceEmail({
      tenantName,
      invoice: {
        serie: "A", folio: "001", subtotal: "1000.00", tax: "160.00", total: "1160.00",
        issuedAt: new Date("2026-10-02T12:00:00Z"),
      } as Invoice,
      customer: { name: "Cliente" } as Customer,
      recipientEmail: "customer@example.test",
    });
    expectCompanyMessage(tenantName, true);
  });

  it("brands scheduled visit reminder senders with their company", async () => {
    await sendScheduledVisitReminderEmail("seller@example.test", {
      companyName: tenantName, customerName: "Cliente", sellerName: "Vendedor",
      scheduledDate: "2026-10-02", meetingType: "Visita", topics: [],
    });
    expectCompanyMessage(tenantName);
  });
});