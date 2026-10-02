// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FollowUpOutcome, FollowUpStatus, MeetingType } from "@shared/schema";
import CheckinDetailPage from "./checkin-detail-page";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  invalidateQueries: vi.fn(),
  navigate: vi.fn(),
  setQueryData: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("wouter", async () => {
  const React = await import("react");
  return {
    useLocation: () => ["/checkins/checkin-1", mocks.navigate],
    useParams: () => ({ id: "checkin-1" }),
    Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) =>
      React.createElement("a", { href, ...props }, children),
    Redirect: ({ to }: { to: string }) => React.createElement("div", { "data-redirect": to }),
  };
});

vi.mock("@/lib/queryClient", () => ({
  apiRequest: mocks.apiRequest,
  queryClient: {
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock("@/hooks/use-i18n", () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/checkin-photo-uploader", () => ({
  CheckinPhotoUploader: () => null,
}));

vi.mock("@/components/ui/dialog", async () => {
  const React = await import("react");
  const DialogContext = React.createContext(false);
  const wrapper = (tag: string) => {
    return ({ children, ...props }: React.HTMLAttributes<HTMLElement>) =>
      React.createElement(tag, props, children);
  };

  return {
    Dialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
      React.createElement(DialogContext.Provider, { value: open }, children),
    DialogContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
      const open = React.useContext(DialogContext);
      return open ? React.createElement("div", props, children) : null;
    },
    DialogHeader: wrapper("div"),
    DialogDescription: wrapper("p"),
    DialogFooter: wrapper("div"),
    DialogTitle: wrapper("h2"),
  };
});

vi.mock("@/components/ui/select", async () => {
  const React = await import("react");

  function findTrigger(children: React.ReactNode): Record<string, unknown> {
    let triggerProps: Record<string, unknown> = {};
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === SelectTrigger) {
        triggerProps = child.props;
      } else {
        triggerProps = { ...triggerProps, ...findTrigger(child.props.children) };
      }
    });
    return triggerProps;
  }

  function collectOptions(children: React.ReactNode): React.ReactElement[] {
    const options: React.ReactElement[] = [];
    React.Children.forEach(children, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === SelectItem) {
        options.push(child);
      } else {
        options.push(...collectOptions(child.props.children));
      }
    });
    return options;
  }

  function SelectTrigger() {
    return null;
  }
  function SelectItem() {
    return null;
  }

  return {
    Select: ({
      value,
      onValueChange,
      children,
    }: {
      value?: string;
      onValueChange?: (value: string) => void;
      children: React.ReactNode;
    }) => {
      const triggerProps = findTrigger(children);
      const options = collectOptions(children);
      return React.createElement(
        "select",
        {
          ...triggerProps,
          value: value ?? "",
          onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(event.currentTarget.value),
        },
        options.map((option) =>
          React.createElement(
            "option",
            { key: String(option.props.value), value: option.props.value },
            option.props.children,
          ),
        ),
      );
    },
    SelectTrigger,
    SelectValue: () => null,
    SelectContent: ({ children }: { children: React.ReactNode }) => children,
    SelectItem,
  };
});

const checkin = {
  id: "checkin-1",
  customerId: "customer-1",
  customer: { id: "customer-1", name: "Example Customer", contactName: null },
  checkinAt: "2026-09-30T10:00:00.000Z",
  followUpStatus: FollowUpStatus.OPEN,
  followUpOutcome: null,
  followUpClosedAt: null,
  followUpReason: null,
  checkoutNotes: "",
  internalNotes: "",
  meetingType: MeetingType.VISITA,
  minutePdfPath: null,
  latitude: null,
  longitude: null,
  notes: null,
  photos: [],
  updates: [],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(["/api/checkins/checkin-1"], checkin);
  queryClient.setQueryData(["/api/customers/customer-1/summary"], {});

  return render(
    React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(CheckinDetailPage),
    ),
  );
}

function successfulResponse(json: unknown = {}) {
  return { json: async () => json };
}

describe("Check-in detail redirects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("redirects to the dashboard after saving a contact and its agreements", async () => {
    mocks.apiRequest.mockResolvedValue(successfulResponse());
    renderPage();

    fireEvent.click(screen.getByTestId("button-add-followup-update"));
    fireEvent.change(screen.getByTestId("textarea-checkout-notes"), {
      target: { value: "Send the revised proposal by Friday." },
    });
    fireEvent.click(screen.getByTestId("button-confirm-checkout"));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/dashboard"));
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/checkins/checkin-1/checkout",
      expect.objectContaining({
        checkoutNotes: "Send the revised proposal by Friday.",
      }),
    );
  });

  it("keeps the user on the contact when saving fails and shows the error toast", async () => {
    mocks.apiRequest.mockRejectedValue(new Error("Contact save failed"));
    renderPage();

    fireEvent.click(screen.getByTestId("button-add-followup-update"));
    fireEvent.click(screen.getByTestId("button-confirm-checkout"));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "label.error",
          description: "Contact save failed",
          variant: "destructive",
        }),
      ),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard after closing a follow-up", async () => {
    mocks.apiRequest.mockResolvedValue(successfulResponse());
    renderPage();

    fireEvent.click(screen.getByTestId("button-checkout"));
    fireEvent.change(screen.getByTestId("select-followup-outcome"), {
      target: { value: FollowUpOutcome.SALE },
    });
    fireEvent.click(screen.getByTestId("button-confirm-close-followup"));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith("/dashboard"));
    expect(mocks.apiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/checkins/checkin-1/close-followup",
      expect.objectContaining({ outcome: FollowUpOutcome.SALE }),
    );
  });

  it("keeps the user on the follow-up when closing fails and shows the error toast", async () => {
    mocks.apiRequest.mockRejectedValue(new Error("Follow-up close failed"));
    renderPage();

    fireEvent.click(screen.getByTestId("button-checkout"));
    fireEvent.change(screen.getByTestId("select-followup-outcome"), {
      target: { value: FollowUpOutcome.SALE },
    });
    fireEvent.click(screen.getByTestId("button-confirm-close-followup"));

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "label.error",
          description: "Follow-up close failed",
          variant: "destructive",
        }),
      ),
    );
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});