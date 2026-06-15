import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import HorizonIndicatorDetailScreen from "./HorizonIndicatorDetailScreen";

// Mock tRPC module — no Provider needed
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      horizon: {
        scenarios: {
          getLinkedIndicators: { invalidate: vi.fn() },
          list: { invalidate: vi.fn() },
        },
        signals: {
          listIndicators: { invalidate: vi.fn() },
          listSuggestions: { invalidate: vi.fn() },
          getIndicator: { invalidate: vi.fn() },
        },
      },
    }),
    horizon: {
      scenarios: {
        getById: { useQuery: vi.fn() },
      },
      signals: {
        getIndicator: { useQuery: vi.fn() },
        listIndicators: { useQuery: vi.fn() },
        listSuggestions: { useQuery: vi.fn() },
        approveLink: { useMutation: vi.fn() },
        dismissLink: { useMutation: vi.fn() },
        approveLinks: { useMutation: vi.fn() },
        dismissLinks: { useMutation: vi.fn() },
        deleteIndicator: { useMutation: vi.fn() },
        updateIndicator: { useMutation: vi.fn() },
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useParams: vi.fn(() => ({ id: "test-indicator-id" })),
  useLocation: vi.fn(() => ["/", vi.fn()]),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import { trpc } from "@/lib/trpc";
const mockTrpc = trpc as any;

const INDICATOR_DATA = {
  indicator: {
    id: "test-indicator-id",
    name: "Test Indicator",
    category: "political",
    description: "A test indicator",
    regionScope: "EU",
    strength: 7,
    timeWeight: "week",
    decayBehaviour: "linear",
    status: "normal",
    accelerationScore: 0.42,
    currentValue: 3.1,
    baselineValue: 2.0,
  },
  trend: [],
  scenarioImpact: [],
  triggerHistory: [],
  linkedEvidence: [],
};

const SUGGESTIONS = [
  {
    id: "sig-1",
    title: "Signal Event Alpha",
    score: 0.85,
    sourceHost: "example.com",
    sourceUrl: "https://example.com/article-1",
    confidenceScore: 0.75,
    createdAt: "2026-06-10T10:00:00Z",
    status: "pending",
    canonicalId: null,
  },
  {
    id: "sig-2",
    title: "Signal Event Beta",
    score: 0.62,
    sourceHost: "news.org",
    sourceUrl: null,
    confidenceScore: 0.4,
    createdAt: "2026-06-11T08:30:00Z",
    status: "pending",
    canonicalId: null,
  },
];

function setupDefaultMocks() {
  mockTrpc.horizon.signals.getIndicator.useQuery.mockReturnValue({
    data: INDICATOR_DATA,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
  mockTrpc.horizon.signals.listSuggestions.useQuery.mockReturnValue({
    data: [],
    isLoading: false,
    isError: false,
  });
  mockTrpc.horizon.signals.approveLink.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  });
  mockTrpc.horizon.signals.dismissLink.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
    variables: undefined,
  });
  mockTrpc.horizon.signals.approveLinks.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockTrpc.horizon.signals.dismissLinks.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockTrpc.horizon.signals.deleteIndicator.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockTrpc.horizon.signals.updateIndicator.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
}

describe("HorizonIndicatorDetailScreen — SuggestionsPanel", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  it("shows the 'No pending suggestions' empty state when listSuggestions returns an empty array", () => {
    mockTrpc.horizon.signals.listSuggestions.useQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<HorizonIndicatorDetailScreen />);

    expect(screen.getByText("No pending suggestions")).toBeInTheDocument();
  });

  it("renders both suggestion titles when listSuggestions returns data", () => {
    mockTrpc.horizon.signals.listSuggestions.useQuery.mockReturnValue({
      data: SUGGESTIONS,
      isLoading: false,
      isError: false,
    });

    render(<HorizonIndicatorDetailScreen />);

    expect(screen.getByText("Signal Event Alpha")).toBeInTheDocument();
    expect(screen.getByText("Signal Event Beta")).toBeInTheDocument();
  });

  it("calls approveLink.mutate with the correct signalEventId when Approve is clicked", () => {
    const approveMutate = vi.fn();
    mockTrpc.horizon.signals.approveLink.useMutation.mockReturnValue({
      mutate: approveMutate,
      isPending: false,
      variables: undefined,
    });
    mockTrpc.horizon.signals.listSuggestions.useQuery.mockReturnValue({
      data: SUGGESTIONS,
      isLoading: false,
      isError: false,
    });

    render(<HorizonIndicatorDetailScreen />);

    // There are two Approve buttons; click the first (sig-1)
    const approveButtons = screen.getAllByRole("button", { name: /approve/i });
    // Filter to individual-row approve buttons (not "Approve selected")
    const rowApproveButton = approveButtons.find(
      (btn) => btn.textContent?.trim() === "Approve",
    );
    expect(rowApproveButton).toBeDefined();
    fireEvent.click(rowApproveButton!);

    expect(approveMutate).toHaveBeenCalledWith({ signalEventId: "sig-1" });
  });

  it("calls dismissLink.mutate with the correct signalEventId when Dismiss is clicked", () => {
    const dismissMutate = vi.fn();
    mockTrpc.horizon.signals.dismissLink.useMutation.mockReturnValue({
      mutate: dismissMutate,
      isPending: false,
      variables: undefined,
    });
    mockTrpc.horizon.signals.listSuggestions.useQuery.mockReturnValue({
      data: SUGGESTIONS,
      isLoading: false,
      isError: false,
    });

    render(<HorizonIndicatorDetailScreen />);

    const dismissButtons = screen.getAllByRole("button", { name: /dismiss/i });
    const rowDismissButton = dismissButtons.find(
      (btn) => btn.textContent?.trim() === "Dismiss",
    );
    expect(rowDismissButton).toBeDefined();
    fireEvent.click(rowDismissButton!);

    expect(dismissMutate).toHaveBeenCalledWith({ signalEventId: "sig-1" });
  });

  it("calls approveLinks.mutate with selected IDs when 'Approve selected' is clicked after checking a suggestion", () => {
    const approveLinksMutate = vi.fn();
    mockTrpc.horizon.signals.approveLinks.useMutation.mockReturnValue({
      mutate: approveLinksMutate,
      isPending: false,
    });
    mockTrpc.horizon.signals.listSuggestions.useQuery.mockReturnValue({
      data: SUGGESTIONS,
      isLoading: false,
      isError: false,
    });

    render(<HorizonIndicatorDetailScreen />);

    // Each suggestion row has a checkbox-style button with aria-label "Select"
    const selectButtons = screen.getAllByRole("button", { name: /^select$/i });
    // Click the first one to select sig-1
    fireEvent.click(selectButtons[0]);

    // Now click "Approve selected" — it should be enabled
    const approveSelectedButton = screen.getByRole("button", {
      name: /approve selected/i,
    });
    fireEvent.click(approveSelectedButton);

    expect(approveLinksMutate).toHaveBeenCalledWith({
      signalEventIds: ["sig-1"],
    });
  });
});
