import type { Checkin, Customer, Tenant, User } from "@shared/schema";
import type { generateMinutePDFStream } from "./pdf-generator";

type PdfData = Parameters<typeof generateMinutePDFStream>[0];

interface CheckinPdfSources {
  latestMinute: (checkin: Checkin) => Promise<{ minutePdfPath: string | null } | undefined>;
  customer: (id: string) => Promise<Customer | undefined>;
  seller: (id: string) => Promise<User | undefined>;
  tenant: (id: string) => Promise<Tenant | undefined>;
}

/** Called only after the route has authorized access to the check-in.
 * Existing minutes remain immutable; an unrecorded visit is a read-only snapshot.
 */
export async function resolveCheckinPdf(checkin: Checkin, sources: CheckinPdfSources): Promise<
  { path: string; data?: never } | { data: PdfData; path?: never }
> {
  if (checkin.minutePdfPath) return { path: checkin.minutePdfPath };
  const latest = await sources.latestMinute(checkin);
  if (latest?.minutePdfPath) return { path: latest.minutePdfPath };

  const [customer, user, tenant] = await Promise.all([
    sources.customer(checkin.customerId),
    sources.seller(checkin.salesPersonId || checkin.userId),
    checkin.tenantId ? sources.tenant(checkin.tenantId) : undefined,
  ]);
  if (!customer || !user) throw new Error("CHECKIN_PDF_MISSING_PARTICIPANT");
  // Parent-company administrators can register visits in a child company.
  // The seller is the authorized record's stored reference, not a caller-supplied ID.
  if (customer.tenantId !== checkin.tenantId) {
    throw new Error("CHECKIN_PDF_MISSING_PARTICIPANT");
  }
  return { data: { checkin, customer, user, tenant, checkoutNotes: checkin.checkoutNotes ?? undefined } };
}
