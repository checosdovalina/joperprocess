// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import AccountStatementsPage from "./account-statements-page";
import { UserRole } from "@shared/schema";

const mocks = vi.hoisted(() => ({
  role: "vendedor",
  queries: [] as any[],
  mutate: vi.fn(),
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
    }] : options.queryKey[0] === "/api/account-statement-schedule" ? null
      : options.queryKey[0] === "/api/microsip-seller-zones" ? [
        { id: "zone-one", vendedorId: 12, name: "CENTRO", userId: "seller-one", customerCount: 3 },
      ] : options.queryKey[0] === "/api/account-statement-schedule/copy-candidates" ? [
        { id: "seller-one", fullName: "Vendedor Centro", email: "seller@test.local", role: "vendedor", receiveEmailNotifications: true },
      ] : [];
    return { data, isLoading: false, refetch: vi.fn(), dataUpdatedAt: Date.now() };
  },
  useMutation: () => ({ mutate: mocks.mutate, isPending: false }),
}));

beforeEach(() => {
  mocks.role = UserRole.VENDEDOR;
  mocks.queries.length = 0;
  mocks.mutate.mockClear();
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

  it("shows zone sellers in a native selector and supports assigning and clearing", () => {
    mocks.role = UserRole.ADMIN;
    render(<AccountStatementsPage />);
    fireEvent.click(screen.getByTestId("button-schedule"));
    const selector = screen.getByRole("combobox", { name: "Vendedor de CENTRO" }) as HTMLSelectElement;
    expect(selector.tagName).toBe("SELECT");
    expect(Array.from(selector.options).map(option => option.text)).toEqual(["Sin asignar", "Vendedor Centro"]);
    expect(selector.value).toBe("seller-one");
    fireEvent.change(selector, { target: { value: "" } });
    expect(mocks.mutate).toHaveBeenLastCalledWith({ zoneId: "zone-one", userId: null });
    fireEvent.change(selector, { target: { value: "seller-one" } });
    expect(mocks.mutate).toHaveBeenLastCalledWith({ zoneId: "zone-one", userId: "seller-one" });
  });
});