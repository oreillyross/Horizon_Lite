import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import HorizonScenarioDetailScreen from "./HorizonScenarioDetailScreen";

// Mock tRPC module — no Provider needed
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      horizon: {
        scenarios: {
          getLinkedIndicators: { invalidate: vi.fn() },
          list: { invalidate: vi.fn() },
          getById: { invalidate: vi.fn() },
        },
        signals: {
          listIndicators: { invalidate: vi.fn() },
          listSuggestions: { invalidate: vi.fn() },
        },
      },
    }),
    horizon: {
      scenarios: {
        getById: { useQuery: vi.fn() },
        getLinkedIndicators: { useQuery: vi.fn() },
        assignIndicator: { useMutation: vi.fn() },
        removeIndicator: { useMutation: vi.fn() },
        update: { useMutation: vi.fn() },
        delete: { useMutation: vi.fn() },
      },
      signals: {
        searchIndicators: { useQuery: vi.fn() },
        listSuggestions: { useQuery: vi.fn() },
        approveLink: { useMutation: vi.fn() },
        dismissLink: { useMutation: vi.fn() },
        approveLinks: { useMutation: vi.fn() },
        dismissLinks: { useMutation: vi.fn() },
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useParams: vi.fn(() => ({ id: "test-scenario-id" })),
  useLocation: vi.fn(() => ["/", vi.fn()]),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Suppress Radix Portal warnings in jsdom
vi.mock("@/components/ui/dialog", async () => {
  const actual = await vi.importActual<any>("@/components/ui/dialog");
  return actual;
});

import { trpc } from "@/lib/trpc";
const mockTrpc = trpc as any;

const SCENARIO = {
  id: "test-scenario-id",
  name: "Test Scenario",
  description: "Test description",
  themeId: "theme-1",
  themeName: "Theme Alpha",
};

const INDICATORS = [
  {
    indicatorId: "i1",
    name: "Indicator One",
    weight: 1.5,
    category: "political",
    strength: 7,
    status: "normal",
    timeWeight: "week",
  },
  {
    indicatorId: "i2",
    name: "Indicator Two",
    weight: 2.0,
    category: "infra",
    strength: 5,
    status: "watching",
    timeWeight: "month",
  },
];

function setupDefaultMocks() {
  mockTrpc.horizon.scenarios.getById.useQuery.mockReturnValue({
    data: SCENARIO,
    isLoading: false,
    isError: false,
  });
  mockTrpc.horizon.scenarios.getLinkedIndicators.useQuery.mockReturnValue({
    data: INDICATORS,
    isLoading: false,
    refetch: vi.fn(),
  });
  mockTrpc.horizon.scenarios.assignIndicator.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockTrpc.horizon.scenarios.removeIndicator.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockTrpc.horizon.scenarios.update.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockTrpc.horizon.scenarios.delete.useMutation.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  });
  mockTrpc.horizon.signals.searchIndicators.useQuery.mockReturnValue({
    data: [],
    isLoading: false,
  });
}

describe("HorizonScenarioDetailScreen", () => {
  beforeEach(() => {
    setupDefaultMocks();
  });

  it("renders a skeleton/loading UI when getById.useQuery is loading", () => {
    mockTrpc.horizon.scenarios.getById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    mockTrpc.horizon.scenarios.getLinkedIndicators.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    const { container } = render(<HorizonScenarioDetailScreen />);

    // The skeleton divs have the animate-pulse class
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
    // Scenario name should NOT be in the document yet
    expect(screen.queryByText("Test Scenario")).not.toBeInTheDocument();
  });

  it("renders both linked indicator names when data is returned", () => {
    render(<HorizonScenarioDetailScreen />);

    expect(screen.getByText("Indicator One")).toBeInTheDocument();
    expect(screen.getByText("Indicator Two")).toBeInTheDocument();
  });

  it("calls removeIndicator.mutate with correct args when the remove button is clicked", () => {
    const removeMutate = vi.fn();
    mockTrpc.horizon.scenarios.removeIndicator.useMutation.mockReturnValue({
      mutate: removeMutate,
      isPending: false,
    });

    render(<HorizonScenarioDetailScreen />);

    // Each linked indicator row has a "Remove" sr-only button
    const removeButtons = screen.getAllByRole("button", { name: /remove/i });
    // Click the first one (corresponds to i1)
    fireEvent.click(removeButtons[0]);

    expect(removeMutate).toHaveBeenCalledWith({
      scenarioId: "test-scenario-id",
      indicatorId: "i1",
    });
  });

  it("shows the combobox popover when 'Link Indicator' button is clicked", () => {
    render(<HorizonScenarioDetailScreen />);

    const linkButton = screen.getByRole("button", { name: /link indicator/i });
    fireEvent.click(linkButton);

    // The Command input inside the popover should be visible
    expect(screen.getByPlaceholderText("Search indicators...")).toBeInTheDocument();
  });

  it("calls assignIndicator.mutate with correct args when an indicator is selected from search", () => {
    const assignMutate = vi.fn();
    mockTrpc.horizon.scenarios.assignIndicator.useMutation.mockReturnValue({
      mutate: assignMutate,
      isPending: false,
    });
    mockTrpc.horizon.signals.searchIndicators.useQuery.mockReturnValue({
      data: [
        { id: "search-ind-1", name: "Searchable Indicator", category: "diplomatic", strength: 6 },
      ],
      isLoading: false,
    });

    render(<HorizonScenarioDetailScreen />);

    // Open the popover
    const linkButton = screen.getByRole("button", { name: /link indicator/i });
    fireEvent.click(linkButton);

    // The search result should appear
    const resultItem = screen.getByText("Searchable Indicator");
    fireEvent.click(resultItem);

    expect(assignMutate).toHaveBeenCalledWith({
      scenarioId: "test-scenario-id",
      indicatorId: "search-ind-1",
      weight: 1.0,
    });
  });
});
