import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import RecentSourcesScreen from "./RecentSourcesScreen";

// ---- hoisted mocks ----
const mockGetRecentSourceItemsQuery = vi.hoisted(() => vi.fn());
const mockCaptureSourceItemMutation = vi.hoisted(() => vi.fn());
const mockRefreshSourcesMutation = vi.hoisted(() => vi.fn());
const mockInvalidate = vi.hoisted(() => vi.fn());

const mockTrpc = vi.hoisted(() => ({
  useUtils: vi.fn(() => ({
    sources: {
      getRecentSourceItems: {
        invalidate: mockInvalidate,
      },
    },
  })),
  sources: {
    getRecentSourceItems: { useQuery: mockGetRecentSourceItemsQuery },
    refreshSources: { useMutation: mockRefreshSourcesMutation },
    captureSourceItem: { useMutation: mockCaptureSourceItemMutation },
  },
}));

vi.mock("@/lib/trpc", () => ({ trpc: mockTrpc }));

vi.mock("wouter", () => ({
  Link: ({ to, children, ...rest }: any) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

describe("RecentSourcesScreen", () => {
  const mockRefreshMutate = vi.fn();
  const mockCaptureMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockRefreshSourcesMutation.mockReturnValue({
      mutate: mockRefreshMutate,
      isPending: false,
    } as any);

    mockCaptureSourceItemMutation.mockReturnValue({
      mutate: mockCaptureMutate,
      isPending: false,
    } as any);

    mockGetRecentSourceItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);
  });

  it("shows loading state", () => {
    mockGetRecentSourceItemsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<RecentSourcesScreen />);

    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows error state", () => {
    mockGetRecentSourceItemsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: { message: "boom" },
    } as any);

    render(<RecentSourcesScreen />);

    expect(screen.getByText(/Failed to load:/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });

  it("shows empty state", () => {
    mockGetRecentSourceItemsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<RecentSourcesScreen />);

    expect(screen.getByText("No items yet. Click “Refresh”.")).toBeInTheDocument();
  });

  it("renders an item and enables Capture", () => {
    mockGetRecentSourceItemsQuery.mockReturnValue({
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
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<RecentSourcesScreen />);

    expect(screen.getByText("Recent sources")).toBeInTheDocument();
    expect(screen.getByText("HN")).toBeInTheDocument();
    expect(screen.getByText("Interesting post")).toBeInTheDocument();
    expect(screen.getByText("Short excerpt")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Capture" })).toBeEnabled();
  });

  it("calls capture mutation when clicking Capture", () => {
    mockGetRecentSourceItemsQuery.mockReturnValue({
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
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<RecentSourcesScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Capture" }));
    expect(mockCaptureMutate).toHaveBeenCalledWith({ id: "1" });
  });

  

  it("calls refresh mutation when clicking Refresh", () => {
    render(<RecentSourcesScreen />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(mockRefreshMutate).toHaveBeenCalledTimes(1);
  });

  it("disables Refresh button while refresh is pending", () => {
    mockRefreshSourcesMutation.mockReturnValue({
      mutate: mockRefreshMutate,
      isPending: true,
    } as any);

    render(<RecentSourcesScreen />);

    const btn = screen.getByRole("button", { name: "Refreshing…" });
    expect(btn).toBeDisabled();
  });
});
