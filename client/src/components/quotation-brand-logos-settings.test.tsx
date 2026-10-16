// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Tenant } from "@shared/schema";
import QuotationBrandLogosSettings from "./quotation-brand-logos-settings";

const mocks = vi.hoisted(() => ({ invalidate: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/queryClient", () => ({ queryClient: { invalidateQueries: mocks.invalidate } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/use-i18n", () => ({
  useI18n: () => ({
    t: (key: string) => ({
      "settings.quotation-logos.choose-file": "Elegir logo {brand}",
      "settings.quotation-logos.replace": "Cambiar logo {brand}",
      "settings.quotation-logos.remove": "Quitar logo {brand}",
      "settings.quotation-logos.additional-1": "Logo adicional 1",
      "settings.quotation-logos.additional-2": "Logo adicional 2",
    }[key] || key),
  }),
}));

const company = { id: "agroesa", name: "Agroesa", subdomain: "agroesa", logoUrl: "/api/logos/company.png" } as Tenant;
let fetchMock: ReturnType<typeof vi.fn>;
function mount(data = company) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const view = (tenant: Tenant) => (
    <QueryClientProvider client={client}><QuotationBrandLogosSettings company={tenant} /></QueryClientProvider>
  );
  const result = render(view(data));
  return { ...result, update: (tenant: Tenant) => result.rerender(view(tenant)) };
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("quotation brand logo settings controls", () => {
  it("shows upload controls for other companies without assigning Agroesa's logos", () => {
    mount({ ...company, name: "Joper", subdomain: "joper" });
    expect(screen.getByLabelText("Elegir logo Logo adicional 1")).toBeTruthy();
    expect(screen.getByLabelText("Elegir logo Logo adicional 2")).toBeTruthy();
    expect(screen.queryByLabelText("Quitar logo Logo adicional 1")).toBeNull();
    expect(screen.queryAllByAltText("McCormick")).toHaveLength(0);
    expect(screen.queryAllByAltText("Faresin")).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows a non-Agroesa administrator to upload its own additional logo", async () => {
    mount({ ...company, name: "Joper", subdomain: "joper" });
    const file = new File(["image"], "my-brand.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Elegir logo Logo adicional 1"), { target: { files: [file] } });
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/company-settings/quotation-logos/mccormick", expect.objectContaining({
      method: "POST", body: file,
    }));
  });

  it("uploads the selected binary image, refreshes settings, and resets the input", async () => {
    mount();
    const input = screen.getByLabelText("Elegir logo McCormick") as HTMLInputElement;
    const file = new File(["image"], "logo.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["/api/company-settings"] }));
    expect(fetchMock).toHaveBeenCalledWith("/api/company-settings/quotation-logos/mccormick", expect.objectContaining({
      method: "POST", body: file, headers: { "Content-Type": "image/png" }, credentials: "include",
    }));
    expect(input.value).toBe("");
    expect(mocks.toast).toHaveBeenCalled();
  });

  it("removes a logo and supports uploading it again after reloading saved settings", async () => {
    const { update } = mount();
    fireEvent.click(screen.getByLabelText("Quitar logo Faresin"));
    await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/company-settings/quotation-logos/faresin", expect.objectContaining({ method: "DELETE" }));
    update({ ...company, quotationBrandLogo2Url: "" });
    expect(screen.queryByLabelText("Quitar logo Faresin")).toBeNull();
    expect(screen.queryAllByAltText("Faresin")).toHaveLength(0);
    expect(screen.getByLabelText("Elegir logo Faresin")).toBeTruthy();
  });

  it("rejects non-images and oversized files before sending", () => {
    mount();
    const input = screen.getByLabelText("Elegir logo McCormick");
    fireEvent.change(input, { target: { files: [new File(["text"], "not-image.txt", { type: "text/plain" })] } });
    const bigFile = new File(["image"], "big.png", { type: "image/png" });
    Object.defineProperty(bigFile, "size", { value: 5 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [bigFile] } });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledTimes(2);
  });

  it("shows server errors without reporting success and permits retry", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "Archivo inválido" }), { status: 400 }));
    mount();
    const input = screen.getByLabelText("Elegir logo McCormick") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["broken"], "logo.png", { type: "image/png" })] } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      description: "Archivo inválido", variant: "destructive",
    })));
    expect(mocks.invalidate).not.toHaveBeenCalled();
    expect(input.value).toBe("");
  });
});
