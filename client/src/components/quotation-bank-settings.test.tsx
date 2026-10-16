// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import QuotationBankSettings from "./quotation-bank-settings";

const mocks = vi.hoisted(() => ({ request: vi.fn(), toast: vi.fn() }));
vi.mock("@/hooks/use-i18n", () => ({ useI18n: () => ({ locale: "es" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/lib/queryClient", async () => {
  const { QueryClient } = await import("@tanstack/react-query");
  return { apiRequest: mocks.request, queryClient: new QueryClient() };
});

const empty = { beneficiary: "", rfc: "", accounts: [] };
const saved = {
  beneficiary: "Empresa de prueba", rfc: "AAA010101AAA",
  accounts: [{ bank: "Banco de prueba", account: "00001234", clabe: "000000000000000013" }],
};

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const view = (companyId: string) => (
    <QueryClientProvider client={client}>
      <QuotationBankSettings key={companyId} companyId={companyId} />
    </QueryClientProvider>
  );
  const result = render(view("company-a"));
  return { ...result, switchCompany: () => result.rerender(view("company-b")) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.request.mockImplementation(async (method: string, _url: string, data: unknown) =>
    new Response(JSON.stringify(method === "PUT" ? data : empty), { status: 200 }),
  );
});
afterEach(cleanup);

describe("quotation bank settings editor", () => {
  it("adds, saves, edits and removes accounts while retaining leading zeros", async () => {
    mount();
    await screen.findByText("Agregar cuenta");
    fireEvent.click(screen.getByText("Agregar cuenta"));
    fireEvent.change(screen.getByLabelText("Beneficiario"), { target: { value: saved.beneficiary } });
    fireEvent.change(screen.getByLabelText("RFC"), { target: { value: saved.rfc } });
    fireEvent.change(screen.getByLabelText("Banco"), { target: { value: saved.accounts[0].bank } });
    fireEvent.change(screen.getByLabelText("Número de cuenta"), { target: { value: saved.accounts[0].account } });
    fireEvent.change(screen.getByLabelText("CLABE"), { target: { value: saved.accounts[0].clabe } });
    fireEvent.click(screen.getByText("Guardar cuentas"));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith("PUT", "/api/company-settings/bank-details", saved));
    await screen.findByText("Guardar cuentas");
    fireEvent.change(screen.getByLabelText("Banco"), { target: { value: "Banco editado" } });
    fireEvent.click(screen.getByText("Guardar cuentas"));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith("PUT", "/api/company-settings/bank-details", {
      ...saved, accounts: [{ ...saved.accounts[0], bank: "Banco editado" }],
    }));
    await screen.findByText("Guardar cuentas");
    fireEvent.click(screen.getByLabelText("Quitar cuenta 1"));
    fireEvent.click(screen.getByText("Guardar cuentas"));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith("PUT", "/api/company-settings/bank-details", {
      ...saved, accounts: [],
    }));
  });

  it("blocks an invalid check digit before calling the server", async () => {
    mocks.request.mockResolvedValue(new Response(JSON.stringify(saved)));
    mount();
    await screen.findByLabelText("CLABE");
    fireEvent.change(screen.getByLabelText("CLABE"), { target: { value: "000000000000000019" } });
    fireEvent.click(screen.getByText("Guardar cuentas"));
    expect(await screen.findByText(/La CLABE debe tener 18 dígitos/)).toBeTruthy();
    expect(mocks.request.mock.calls.every(([method]) => method === "GET")).toBe(true);
  });

  it("confirms deletion and resets the visible configuration", async () => {
    mocks.request.mockImplementation(async (method: string) =>
      new Response(JSON.stringify(method === "DELETE" ? empty : saved)),
    );
    mount();
    await screen.findByLabelText("CLABE");
    fireEvent.click(screen.getByText("Eliminar toda la configuración"));
    expect(mocks.request.mock.calls.some(([method]) => method === "DELETE")).toBe(false);
    fireEvent.click(screen.getByText("Cancelar"));
    expect(mocks.request.mock.calls.some(([method]) => method === "DELETE")).toBe(false);
    fireEvent.click(screen.getByText("Eliminar toda la configuración"));
    fireEvent.click(screen.getByText("Eliminar todo"));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith("DELETE", "/api/company-settings/bank-details"));
    await waitFor(() => expect(screen.queryByLabelText("CLABE")).toBeNull());
    expect((screen.getByLabelText("Beneficiario") as HTMLInputElement).value).toBe("");
  });

  it("does not carry saved accounts or unsaved drafts into another company", async () => {
    mocks.request.mockResolvedValueOnce(new Response(JSON.stringify(saved)));
    const { switchCompany } = mount();
    await screen.findByLabelText("CLABE");
    fireEvent.change(screen.getByLabelText("Beneficiario"), { target: { value: "Edición sin guardar" } });
    switchCompany();
    await screen.findByText("Agregar cuenta");
    expect((screen.getByLabelText("Beneficiario") as HTMLInputElement).value).toBe("");
    expect(screen.queryByLabelText("CLABE")).toBeNull();
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });

  it("shows loading errors and retries instead of offering an empty editable configuration", async () => {
    mocks.request.mockRejectedValueOnce(new Error("Error de conexión"));
    mount();
    await screen.findByRole("alert");
    expect(screen.queryByText("Guardar cuentas")).toBeNull();
    fireEvent.click(screen.getByText("Reintentar"));
    await screen.findByText("Guardar cuentas");
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
});
