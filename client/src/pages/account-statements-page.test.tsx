// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import AccountStatementsPage from "./account-statements-page";
import { UserRole } from "@shared/schema";

const mocks = vi.hoisted(() => ({
  role: "vendedor",
  queries: [] as any[],
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { role: mocks.role } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => {
    mocks.queries.push(options);
    const data = options.queryKey[0] === "/api/account-statements" ? [{
      customer: { id: "customer-one", name: "Customer", email: "customer@test.local", rfc: "DOMESTIC" },
      totalBalance: 100, overdueBalance: 0, invoiceCount: 1,
      oldestDueDate: null, currency: "MXN",
    }] : options.queryKey[0] === "/api/account-statement-schedule" ? null : [];
    return { data, isLoading: false, refetch: vi.fn(), dataUpdatedAt: Date.now() };
  },
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
}));

beforeEach(() => {
  mocks.role = UserRole.VENDEDOR;
  mocks.queries.length = 0;
});
afterEach(cleanup);

describe("Seller read-only account statements", () => {
  it("offers statement browsing and PDF download without management controls", () => {
    render(<AccountStatementsPage />);
    // Both responsive layouts exist in jsdom; each must offer the PDF action.
    expect(screen.getAllByTestId("button-download-customer-one")).toHaveLength(2);
    expect(screen.queryByTestId("button-schedule")).toBeNull();
    expect(screen.queryByTestId("button-bulk-send")).toBeNull();
    expect(screen.queryByTestId("button-send-customer-one")).toBeNull();
    expect(screen.queryByTestId("checkbox-select-customer-one")).toBeNull();
    expect(mocks.queries.find(options => options.queryKey[0] === "/api/account-statement-schedule")?.enabled).toBe(false);
  });

  it("preserves the management controls and queries for existing privileged roles", () => {
    mocks.role = UserRole.ADMIN;
    render(<AccountStatementsPage />);
    expect(screen.getByTestId("button-schedule")).toBeTruthy();
    expect(mocks.queries.find(options => options.queryKey[0] === "/api/account-statement-schedule")?.enabled).toBe(true);
  });
});