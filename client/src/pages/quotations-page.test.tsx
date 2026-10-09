// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QuotationStatus } from "@shared/schema";
import QuotationsPage from "./quotations-page";

const mocks = vi.hoisted(() => ({
  quotations: [] as any[],
}));

vi.mock("@/hooks/use-entity-query", () => ({
  useEntityQuery: (endpoint: string) => ({
    data: endpoint === "/api/quotations" ? mocks.quotations : [],
    isLoading: false,
    dataUpdatedAt: Date.now(),
  }),
  useEntityMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "seller-1", role: "admin", empresaId: null } }),
}));
vi.mock("@/hooks/use-tenant", () => ({ useTenant: () => ({ tenant: { name: "Nexxo" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock("@/components/quotation-form", () => ({ QuotationForm: () => null }));

function quotation(id: string, status: string) {
  return {
    id,
    folio: `MEX-${id}`,
    status,
    createdAt: "2026-10-08T12:00:00.000Z",
    customer: { id: `customer-${id}`, name: `Customer ${id}`, rfc: null },
    userId: "seller-1",
    empresaId: null,
    currency: "MXN",
    total: "1000.00",
    items: [],
  };
}

beforeEach(() => {
  window.history.replaceState({}, "", "/");
  mocks.quotations = [
    quotation("draft", QuotationStatus.DRAFT),
    quotation("pending", QuotationStatus.PENDING_APPROVAL),
    quotation("sent", QuotationStatus.SENT),
    quotation("rejected", QuotationStatus.REJECTED),
    quotation("expired", QuotationStatus.EXPIRED),
    quotation("converted", QuotationStatus.CONVERTED),
  ];
});
afterEach(cleanup);

describe("Quotation status tabs", () => {
  it("shows sent, rejected, and expired quotations in separate tabs", () => {
    render(<QuotationsPage />);
    expect(screen.getByTestId("tab-active").textContent).toContain("2");
    expect(screen.getByTestId("tab-sent").textContent).toContain("1");
    expect(screen.getByTestId("tab-rejected").textContent).toContain("1");
    expect(screen.getByTestId("tab-expired").textContent).toContain("1");

    for (const [tab, visibleId, hiddenIds] of [
      ["tab-sent", "sent", ["rejected", "expired"]],
      ["tab-rejected", "rejected", ["sent", "expired"]],
      ["tab-expired", "expired", ["sent", "rejected"]],
    ] as const) {
      fireEvent.click(screen.getByTestId(tab));
      expect(screen.getByTestId(`row-quotation-${visibleId}`)).toBeTruthy();
      for (const hiddenId of hiddenIds) {
        expect(screen.queryByTestId(`row-quotation-${hiddenId}`)).toBeNull();
      }
    }
  });

  it("opens the matching tab when a status filter is provided in the URL", () => {
    window.history.replaceState({}, "", "/quotations?status=rejected");
    render(<QuotationsPage />);
    expect(screen.getByTestId("tab-rejected").getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByTestId("row-quotation-rejected")).toBeTruthy();
    expect(screen.queryByTestId("row-quotation-sent")).toBeNull();
  });
});
