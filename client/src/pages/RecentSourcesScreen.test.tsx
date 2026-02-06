import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import RecentSourcesScreen from "./RecentSourcesScreen";
import { trpc } from "@/lib/trpc";

// ------------------
// mocks
// ------------------

// mock wouter Link
vi.mock("wouter", () => ({
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const invalidateMock = vi.fn();

const mockUseUtils = {
  getRecentSourceItems: {
    invalidate: invalidateMock,
  },
};

const mockRefreshMutate = vi.fn();
const mockCaptureMutate = vi.fn();

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: vi.fn(() => mockUseUtils),
    getRecentSourceItems: {
      useQuery: vi.fn(),
    },
    refreshSources: {
      useMutation: vi.fn(),
    },
    captureSourceItem: {
      useMutation: vi.fn(),
    },
  },
}));

// ------------------
// helpers
// ------------------

function mockQuery(state: Partial<any>) {
  vi.mocked(trpc.getRecentSourceItems.useQuery).mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...state,
  } as any);
}

function mockMutations() {
  vi.mocked(trpc.refreshSources.useMutation).mockReturnValue({
    mutate: mockRefreshMutate,
    isPending: false,
  } as any);

  vi.mocked(trpc.captureSourceItem.useMutation).mockReturnValue({
    mutate: mockCaptureMutate,
    isPending: false,
  } as any);
}

// ------------------
// tests
// ------------------

describe("RecentSourcesScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockMutations();
  });

  it("shows loading state", () => {
    mockQuery({ isLoading: true });

    render(<RecentSourcesScreen />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockQuery({ data: [] });

    render(<RecentSourcesScreen />);

    expect(
      screen.getByText("No items yet. Click “Refresh”.")
    ).toBeInTheDocument();
  });

  it("renders items and capture button", () => {
    mockQuery({
      data: [
        {
          id: "1",
          sourceName: "HN",
          title: "Interesting post",
          url: "https://example.com",
          excerpt: "Short excerpt",
          fetchedAt: new Date().toISOString(),
          publishedAt: null,
          capturedAt: null,
          capturedSnippetId: null,
        },
      ],
    });

    render(<RecentSourcesScreen />);

    expect(screen.getByText("HN")).toBeInTheDocument();
    expect(screen.getByText("Interesting post")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Capture" })).toBeEnabled();
  });

  it("calls capture mutation when clicking Capture", () => {
    mockQuery({
      data: [
        {
          id: "1",
          sourceName: "HN",
          title: "Interesting post",
          url: "https://example.com",
          excerpt: null,
          fetchedAt: new Date().toISOString(),
          publishedAt: null,
          capturedAt: null,
          capturedSnippetId: null,
        },
      ],
    });

    render(<RecentSourcesScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Capture" }));

    expect(mockCaptureMutate).toHaveBeenCalledWith({ id: "1" });
  });

  it("calls refresh mutation when clicking Refresh", () => {
    mockQuery({ data: [] });

    render(<RecentSourcesScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(mockRefreshMutate).toHaveBeenCalled();
  });
});
