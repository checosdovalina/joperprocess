// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import OrderReleasePage from "./order-release-page";

const mocks = vi.hoisted(() => ({
  mutations: [] as any[],
  toast: vi.fn(),
  invalidateQueries: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [], isLoading: false }),
  useMutation: (options: any) => {
    mocks.mutations.push(options);
    return { isPending: false, mutate: vi.fn() };
  },
}));
vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
  queryClient: { invalidateQueries: mocks.invalidateQueries },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/hooks/use-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/components/quotation-form", () => ({ QuotationForm: () => null }));

beforeEach(() => {
  mocks.mutations.length = 0;
  mocks.toast.mockClear();
  mocks.invalidateQueries.mockClear();
});
afterEach(cleanup);

describe("Order release feedback", () => {
  it.each([["approve", 0], ["reject", 2], ["close", 3]] as const)(
    "%s shows the server's actual error and refreshes the stale release lists",
    (_action, mutationIndex) => {
      render(<OrderReleasePage />);
      const message = "El pedido ya fue procesado o finalizado. Actualiza la lista";
      act(() => mocks.mutations[mutationIndex].onError(new Error(message)));
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
        variant: "destructive", description: message,
      }));
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/order-release?status=pending"] });
      expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["/api/order-release?status=history"] });
    },
  );

  it.each([
    ["401: Unauthorized", "release.toast.session-expired"],
    ["403: Forbidden", "release.toast.not-allowed"],
    ["", "release.toast.release-error"],
  ])("explains %s without hiding the failure", (message, expected) => {
    render(<OrderReleasePage />);
    act(() => mocks.mutations[0].onError(new Error(message)));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ description: expected }));
  });

  it("does not claim email delivery when an approval is merely saved", () => {
    render(<OrderReleasePage />);
    act(() => mocks.mutations[0].onSuccess());
    expect(mocks.toast).toHaveBeenCalledWith({
      title: "release.toast.released", description: "release.toast.release-saved",
    });
  });
});