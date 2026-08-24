import { afterEach, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { Readable } from "node:stream";

import { generateQuotationPDFStream } from "./quotation-pdf-generator";
import { generateInvoicePDFStream } from "./invoice-pdf-generator";
import { generateCreditAuthPDFStream } from "./credit-auth-pdf-generator";
import { generateMinutePDFStream } from "./pdf-generator";
import { generateShipmentRemisionPDF } from "./shipment-remision-pdf-generator";
import { generateAccountStatementPDF } from "./account-statement-pdf-generator";
import { generateIncidentsReportPDF, generateOrdersReportPDF } from "./reports-pdf-generator";
import { generateIncidentWarrantyPDF } from "./incident-warranty-pdf-generator";
import { generatePublicIncidentPDFStream } from "./public-incident-pdf-generator";
import { formatPdfDate, pdfText, resolveIntlLocale, resolvePdfLanguage } from "./pdf-locale";

const execFileAsync = promisify(execFile);
const temporaryDirectories: string[] = [];
const fixedDate = new Date("2024-01-15T12:00:00.000Z");

const tenant = (locale: "en" | "es") => ({
  name: "Regression Test Company",
  locale,
  timezone: "UTC",
  primaryColor: "#1a365d",
});

async function streamToText(stream: Readable, name: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "nexxo-pdf-locale-"));
  temporaryDirectories.push(directory);
  const pdfPath = join(directory, `${name}.pdf`);
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  await writeFile(pdfPath, Buffer.concat(chunks));
  const { stdout } = await execFileAsync("pdftotext", ["-layout", pdfPath, "-"]);
  return stdout;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

const customer = {
  id: "customer-1",
  name: "Customer Name",
  rfc: "XAXX010101000",
  contactName: "Customer Contact",
  phone: "5550101",
  email: "customer@example.test",
  address: "1 Test Street",
  city: "Test City",
  state: "Test State",
  country: "Mexico",
} as any;

const user = { id: "user-1", fullName: "Test Salesperson" } as any;
const quotation = {
  id: "quotation-1",
  folio: "Q-100",
  createdAt: fixedDate,
  validUntil: fixedDate,
  currency: "MXN",
  paymentTerms: "30_dias",
  deliveryTime: "inmediato",
  subtotal: "100",
  tax: "16",
  total: "116",
  globalDiscount: "0",
} as any;
const quotationItem = {
  id: "quotation-item-1",
  productCode: "P-100",
  productName: "Test product",
  quantity: "1",
  unitPrice: "100",
  subtotal: "100",
  discountPercent: "0",
  currency: "MXN",
} as any;
const invoice = {
  id: "invoice-1",
  serie: "A",
  folio: "I-100",
  issuedAt: fixedDate,
  dueDate: fixedDate,
  currency: "MXN",
  paymentMethod: "PUE",
  paymentForm: "03",
  subtotal: "100",
  tax: "16",
  total: "116",
} as any;

const documents = [
  {
    name: "quotation",
    english: "QUOTATION",
    spanish: "COTIZACIÓN",
    generate: (locale: "en" | "es") => generateQuotationPDFStream({
      quotation, items: [quotationItem], customer, user, tenant: tenant(locale),
    } as any),
  },
  {
    name: "invoice",
    english: "INVOICE",
    spanish: "FACTURA",
    generate: (locale: "en" | "es") => generateInvoicePDFStream({
      invoice, customer, tenant: tenant(locale),
    } as any),
  },
  {
    name: "credit authorization",
    english: "CREDIT AUTHORIZATION",
    spanish: "AUTORIZACIÓN DE CRÉDITO",
    generate: (locale: "en" | "es") => generateCreditAuthPDFStream({
      authorization: {
        status: "pending", createdAt: fixedDate, creditAvailable: "1000", creditUsed: "0", overdueBalance: "0",
      },
      quotation, customer, requestedBy: user, tenant: tenant(locale),
    } as any),
  },
  {
    name: "customer visit minutes",
    english: "CUSTOMER VISIT MINUTES",
    spanish: "MINUTA DE VISITA A CLIENTE",
    generate: (locale: "en" | "es") => generateMinutePDFStream({
      checkin: { checkinAt: fixedDate, topics: ["Product review"], notes: "Visit notes", photos: [] },
      customer, user, checkoutNotes: "Next steps", tenant: tenant(locale),
    } as any),
  },
  {
    name: "outbound delivery note",
    english: "OUTBOUND DELIVERY NOTE",
    spanish: "REMISIÓN DE SALIDA",
    generate: (locale: "en" | "es") => generateShipmentRemisionPDF({
      folio: "O-100", orderStatus: "pending", scheduledDate: fixedDate.toISOString(),
      customerName: customer.name, customerAddress: customer.address, transporter: "Test Carrier",
      transportType: "propio", products: [{ name: "Test product", quantity: 1, unitOfMeasure: "EA", desde: "Warehouse", serialNumbers: [] }],
      tenant: tenant(locale),
    }),
  },
  {
    name: "account statement",
    english: "ACCOUNT STATEMENT",
    spanish: "ESTADO DE CUENTA",
    generate: (locale: "en" | "es") => generateAccountStatementPDF({
      customer, invoices: [], payments: [], tenant: tenant(locale),
    } as any),
  },
  {
    name: "orders report",
    english: "ORDERS REPORT",
    spanish: "REPORTE DE PEDIDOS",
    generate: (locale: "en" | "es") => generateOrdersReportPDF({
      orders: [{
        folio: "O-100",
        customerName: "Customer Name",
        closeDate: fixedDate,
        creditReleaseDate: fixedDate,
        purchaseOrder: "PO-100",
        status: "in_production",
        notes: "USER NOTE MUST REMAIN",
        items: [{ productCode: "P-100", productName: "Test product", quantity: "2", unitOfMeasure: "EA" }],
      }],
      filters: { dateFrom: "2024-01-15", dateTo: "2024-01-31" },
      tenant: { ...tenant(locale), timezone: "America/Chicago" },
    }),
  },
  {
    name: "incidents report",
    english: "ACTIVE INCIDENTS REPORT",
    spanish: "REPORTE DE INCIDENTES VIGENTES",
    generate: (locale: "en" | "es") => generateIncidentsReportPDF({
      incidents: [], cutoffDate: fixedDate, tenant: tenant(locale),
    }),
  },
  {
    name: "warranty sheet",
    english: "WARRANTY SHEET",
    spanish: "HOJA DE GARANTÍA",
    generate: (locale: "en" | "es") => generateIncidentWarrantyPDF({
      ticketNumber: "INC-100", type: "garantia", status: "nuevo", urgency: "alta",
      subject: "Test issue", description: "Test description", createdAt: fixedDate,
      customerName: customer.name, tenant: tenant(locale),
    }),
  },
];

describe("bilingual PDF generators", () => {
  for (const document of documents) {
    it(`${document.name} uses English fixed text for an English tenant`, async () => {
      const text = await streamToText(await document.generate("en"), `${document.name}-en`);
      expect(text).toContain(document.english);
      expect(text).not.toContain(document.spanish);
    });

    it(`${document.name} uses Spanish fixed text for a Spanish tenant`, async () => {
      const text = await streamToText(await document.generate("es"), `${document.name}-es`);
      expect(text).toContain(document.spanish);
      expect(text).not.toContain(document.english);
    });
  }
});

describe("PDF locale helpers", () => {
  it("uses Spanish as the shared fallback and recognizes English locale variants", () => {
    expect(resolvePdfLanguage()).toBe("es");
    expect(resolvePdfLanguage({ locale: null })).toBe("es");
    expect(resolvePdfLanguage({ locale: "fr-CA" })).toBe("es");
    expect(resolvePdfLanguage({ locale: "EN-gb" })).toBe("en");
    expect(resolveIntlLocale("en")).toBe("en-US");
    expect(pdfText(resolvePdfLanguage(), { es: "Español", en: "English" })).toBe("Español");
  });

  it("preserves date-only filter values in negative-offset timezones", () => {
    expect(formatPdfDate("2024-01-15", "en", "America/Chicago")).toBe("01/15/2024");
    expect(formatPdfDate("2024-01-15", "es", "America/Mexico_City")).toBe("15/01/2024");
  });

  it("keeps user-entered report text while localizing body labels and statuses", async () => {
    const report = documents.find((document) => document.name === "orders report")!;
    const text = await streamToText(await report.generate("en"), "orders-report-body-en");
    expect(text).toContain("Purchase Order:");
    expect(text).toContain("In Production");
    expect(text).toContain("USER NOTE MUST REMAIN");
    expect(text).toContain("01/15/2024 to 01/31/2024");
    expect(text).not.toContain("Orden de Compra:");
  });

  it("localizes a public incident PDF in English while preserving incident text", async () => {
    const text = await streamToText(generatePublicIncidentPDFStream({
      ticketNumber: "INC-100", status: "en_proceso", type: "garantia", urgency: "alta",
      subject: "USER SUBJECT MUST REMAIN", description: "USER DESCRIPTION MUST REMAIN", createdAt: fixedDate,
      assignee: { fullName: "Assigned Person" },
      comments: [{ content: "USER COMMENT MUST REMAIN", createdAt: fixedDate, isFromCustomer: false, user: { fullName: "Support Person" } }],
    }, tenant("en")), "public-incident-en");
    expect(text).toContain("INCIDENT REPORT / SERVICE TICKET");
    expect(text).toContain("Status: In Progress");
    expect(text).toContain("Warranty");
    expect(text).toContain("High");
    expect(text).toContain("CONVERSATION");
    expect(text).toContain("USER SUBJECT MUST REMAIN");
    expect(text).toContain("USER COMMENT MUST REMAIN");
    expect(text).not.toContain("REPORTE DE INCIDENTE");
  });

  it("localizes a public incident PDF in Spanish while preserving incident text", async () => {
    const text = await streamToText(generatePublicIncidentPDFStream({
      ticketNumber: "INC-101", status: "en_proceso", type: "garantia", urgency: "alta",
      subject: "TEXTO DEL USUARIO", description: "DESCRIPCIÓN DEL USUARIO", createdAt: fixedDate,
      assignee: { fullName: "Persona Asignada" },
      comments: [{ content: "COMENTARIO DEL USUARIO", createdAt: fixedDate, isFromCustomer: true }],
    }, tenant("es")), "public-incident-es");
    expect(text).toContain("REPORTE DE INCIDENTE / TICKET DE SERVICIO");
    expect(text).toContain("Estado: En Proceso");
    expect(text).toContain("Garantía");
    expect(text).toContain("Alta");
    expect(text).toContain("CONVERSACIÓN");
    expect(text).toContain("TEXTO DEL USUARIO");
    expect(text).toContain("COMENTARIO DEL USUARIO");
    expect(text).not.toContain("INCIDENT REPORT / SERVICE TICKET");
  });
});