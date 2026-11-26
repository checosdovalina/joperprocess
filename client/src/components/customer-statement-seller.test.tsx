// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CustomerStatementSeller } from "./customer-statement-seller";

const mocks = vi.hoisted(() => ({ mutate: vi.fn(), assigned: null as string | null, error: false }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn(), queryClient: { setQueryData: vi.fn(), invalidateQueries: vi.fn() } }));
vi.mock("@tanstack/react-query", () => ({
  useMutation: () => ({ mutate: mocks.mutate, isPending: false }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => ({
    isLoading: false, isError: mocks.error,
    data: queryKey[0].includes("copy-candidates") ? [
      { id: "seller", fullName: "Ana", email: "ana@example.test", receiveEmailNotifications: false },
    ] : { id: "customer", name: "Cliente", statementSellerUserId: mocks.assigned },
  }),
}));
beforeEach(() => { mocks.mutate.mockClear(); mocks.assigned = null; mocks.error = false; });
afterEach(cleanup);

describe("customer seller assignment", () => {
  it("allows selecting a specific seller", () => {
    render(<CustomerStatementSeller customerId="customer" />);
    fireEvent.click(screen.getByRole("button", { name: "Vendedor de Cliente" }));
    expect(screen.getByRole("radio", { name: "Usar vendedor de zona" })).toHaveProperty("checked", true);
    fireEvent.click(screen.getByRole("radio", { name: /Ana/ }));
    expect(mocks.mutate).toHaveBeenCalledWith("seller");
  });
  it("clears the override and warns when the assigned seller opted out", () => {
    mocks.assigned = "seller";
    render(<CustomerStatementSeller customerId="customer" />);
    expect(screen.getByText(/tiene desactivadas/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Vendedor de Cliente" }));
    fireEvent.click(screen.getByRole("radio", { name: "Usar vendedor de zona" }));
    expect(mocks.mutate).toHaveBeenCalledWith(null);
  });
  it("shows loading failures instead of suggesting there are no sellers", () => {
    mocks.error = true;
    render(<CustomerStatementSeller customerId="customer" />);
    expect(screen.getByRole("alert").textContent).toContain("No se pudieron cargar");
    expect(screen.queryByRole("button")).toBeNull();
  });
});
