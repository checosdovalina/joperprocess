// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import CommercialResultsPage from "./commercial-results-page";

const mocks = vi.hoisted(() => ({
  result: null as unknown,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: ({ queryKey }: { queryKey: string[] }) => queryKey[0] === "/api/commercial-results"
    ? { data: mocks.result, isLoading: mocks.isLoading, isError: mocks.isError, refetch: mocks.refetch }
    : { data: [] },
}));
vi.mock("@/hooks/use-auth", () => ({ useAuth: () => ({ user: { id: "seller-1", role: "vendedor" } }) }));
vi.mock("@/hooks/use-i18n", () => ({ useI18n: () => ({ t: (key: string) => key }) }));
vi.mock("@/lib/queryClient", () => ({ apiRequest: vi.fn() }));
vi.mock("recharts", async () => {
  const React = await import("react");
  const chart = ({ children }: { children: React.ReactNode }) => React.createElement("div", {}, children);
  return {
    BarChart: chart, LineChart: chart,
    Bar: ({ dataKey }: { dataKey: string }) => React.createElement("div", { "data-series": dataKey }),
    CartesianGrid: () => null, Line: () => null, XAxis: () => null, YAxis: () => null,
  };
});
vi.mock("@/components/ui/chart", async () => {
  const React = await import("react");
  return {
    ChartContainer: ({ children, ...props }: { children: React.ReactNode; config?: unknown }) => {
      const { config: _config, ...rest } = props;
      return React.createElement("div", rest, children);
    },
    ChartTooltip: () => null,
    ChartTooltipContent: () => null,
  };
});

const results = () => ({
  summary: { totalContacts: 0, prospectVisits: 0, customerVisits: 0, completed: 0, active: 0, uniqueCustomers: 0 },
  daily: [], bySeller: [], byCustomer: [], byMeetingType: [],
  comparison: {
    totals: { visits: 0, sales: 1, rentals: 2, notConverted: 3 },
    bySeller: [{ id: "seller-1", name: "Vendedor Uno", visits: 0, sales: 1, rentals: 2, notConverted: 3 }],
    byMonth: [{ month: "2026-03", visits: 0, sales: 1, rentals: 2, notConverted: 3 }],
  },
});

beforeEach(() => {
  mocks.result = results();
  mocks.isLoading = false;
  mocks.isError = false;
  mocks.refetch.mockClear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Commercial Check-in comparisons", () => {
  it("shows closure-only periods and all three outcomes in both accessible tables", () => {
    const { container } = render(<CommercialResultsPage />);
    expect(screen.queryByText("commercial-results.empty")).toBeNull();
    const sellers = screen.getByRole("table", { name: "commercial-results.comparison-seller-table-caption" });
    const months = screen.getByRole("table", { name: "commercial-results.comparison-month-table-caption" });
    for (const table of [sellers, months]) {
      expect(within(table).getByRole("columnheader", { name: "commercial-results.sales" })).toBeDefined();
      expect(within(table).getByRole("columnheader", { name: "commercial-results.rentals" })).toBeDefined();
      expect(within(table).getByRole("columnheader", { name: "commercial-results.not-converted" })).toBeDefined();
      expect(within(table).getAllByRole("cell").map(cell => cell.textContent)).toEqual(["0", "1", "2", "3"]);
    }
    expect(container.querySelectorAll('[data-series="rentals"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-series="notConverted"]')).toHaveLength(2);
  });

  it("shows a genuine empty state without inventing closed outcomes", () => {
    mocks.result = { ...results(), comparison: { totals: { visits: 0, sales: 0, rentals: 0, notConverted: 0 }, bySeller: [], byMonth: [] } };
    render(<CommercialResultsPage />);
    expect(screen.getByText("commercial-results.empty")).toBeDefined();
    expect(screen.getByText("commercial-results.comparison-no-sellers")).toBeDefined();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("renders request failure and retries instead of displaying false zero totals", () => {
    mocks.isError = true;
    render(<CommercialResultsPage />);
    expect(screen.getByText("commercial-results.error")).toBeDefined();
    expect(screen.queryByText("commercial-results.comparison-title")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "btn.refresh" }));
    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("downloads Excel with the same filters and reports download failures", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["xlsx"]) })
      .mockResolvedValueOnce({ ok: false });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<CommercialResultsPage />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Excel" })); });
    expect(click).toHaveBeenCalledOnce();
    vi.runOnlyPendingTimers();
    expect(fetchMock.mock.calls[0][0]).toMatch(/^\/api\/commercial-results\/export\/xlsx\?from=.*&to=.*&audience=all/);
    expect(fetchMock.mock.calls[0][1]).toEqual({ credentials: "include" });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Excel" })); });
    expect(screen.getByRole("alert").textContent).toBe("commercial-results.export-error");
  });
});