import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, beforeEach, expect, it, vi } from "vitest";
import SnippetTable from "./SnippetTable";
import type { SnippetRow } from "@shared/db";

// ---- hoisted mocks (best for TS + runtime) ----
const mockSetData = vi.fn();
const mockGetSnippetsQuery = vi.hoisted(() => vi.fn());
const mockDeleteSnippetMutation = vi.hoisted(() => vi.fn());
const mockGetThemesQuery = vi.hoisted(() => vi.fn());

const mockTrpc = vi.hoisted(() => ({
  useUtils: vi.fn(() => ({
    snippets: {
      getSnippets: {
        setData: mockSetData,
        // add invalidate if your component uses it
        invalidate: vi.fn(),
      },
      themes: {
        getThemes: {
          invalidate: vi.fn(),
        },
      },
    },
  })),
  snippets: {
    getSnippets: {
      useQuery: mockGetSnippetsQuery,
    },
    deleteSnippet: {
      useMutation: mockDeleteSnippetMutation,
    },
  },
  themes: {
    getThemes: { useQuery: mockGetThemesQuery },
  },
}));

const mockSnippets: SnippetRow[] = [
  {
    id: "1",
    createdAt: new Date("2026-01-23"),
    content: "Test snippet 1",
    tags: ["javascript", "react"],
    sourceHost: null,
    sourceTitle: null,
    sourceUrl: null,
    themeId: null,
  },
  {
    id: "2",
    createdAt: new Date("2026-01-23"),
    content: "Test snippet 2",
    tags: ["typescript"],
    sourceHost: null,
    sourceTitle: null,
    sourceUrl: null,
    themeId: null,
  },
];

vi.mock("@/lib/trpc", () => ({
  trpc: mockTrpc,
}));

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderWithQueryClient = (ui: React.ReactElement) => {
  const client = createTestQueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
};

let mockMutation: {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
};

describe("SnippetTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    mockGetThemesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockMutation = {
      mutate: vi.fn(),
      isPending: false,
    };

    mockDeleteSnippetMutation.mockReturnValue(mockMutation as any);
  });

  it("renders loading state while fetching snippets", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isLoading: true,
      data: undefined,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders snippet table with data", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isLoading: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("Test snippet 1")).toBeInTheDocument();
  });

  it("calls delete mutation when trash icon clicked", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isPending: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    const trashIcons = screen.getAllByLabelText(/delete snippet/i);
    expect(trashIcons).toHaveLength(2);

    fireEvent.click(trashIcons[0]);

    expect(mockMutation.mutate).toHaveBeenCalledWith({ id: "1" });
  });

  it("disables delete button during mutation loading", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isPending: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    const pendingMutation = {
      mutate: vi.fn(),
      isPending: true,
    };
    mockDeleteSnippetMutation.mockReturnValue(pendingMutation as any);

    renderWithQueryClient(<SnippetTable />);

    const trashIcons = screen.getAllByLabelText(/delete snippet/i);
    fireEvent.click(trashIcons[0]);

    expect(pendingMutation.mutate).not.toHaveBeenCalled();
  });

  it("handles empty snippet list", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isLoading: false,
      data: [],
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    expect(screen.getByText(/you have no snippets/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /create snippet/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
