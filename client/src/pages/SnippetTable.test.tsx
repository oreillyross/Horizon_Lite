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
        invalidate: vi.fn(),
      },
    },
    themes: {
      getThemes: {
        invalidate: vi.fn(),
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

vi.mock("@/lib/trpc", () => ({
  trpc: mockTrpc,
}));

const mockSnippets: SnippetRow[] = [
  {
    id: "1",
    createdAt: new Date("2026-01-23T10:00:00.000Z"),
    content: "Test snippet 1",
    tags: ["javascript", "react"],
    sourceHost: null,
    sourceTitle: null,
    sourceUrl: null,
    themeId: null,
  },
  {
    id: "2",
    createdAt: new Date("2026-01-24T10:00:00.000Z"), // newer -> sorts first
    content: "Test snippet 2",
    tags: ["typescript"],
    sourceHost: null,
    sourceTitle: null,
    sourceUrl: null,
    themeId: null,
  },
];

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

function textSnapshot() {
  // “snapshot-ish” but stable vs Radix random ids/attributes
  return (document.body.textContent ?? "").replace(/\s+/g, " ").trim();
}

describe("SnippetTable (Accordion view)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    // avoid the component reading some old open state between tests
    window.localStorage.clear();

    mockGetThemesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    mockDeleteSnippetMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  it("renders loading state while fetching snippets", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isLoading: true,
      data: undefined,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    // accordion content/table should not exist while loading
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    expect(textSnapshot()).toMatchInlineSnapshot(`""`);
  });

  it("renders accordion groups (collapsed) from snippets", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isLoading: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    // Collapsed: no table yet
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    // The trigger contains the theme name + count somewhere inside
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("No theme assigned")).toBeInTheDocument();

    expect(textSnapshot()).toMatchInlineSnapshot(
      `"AllRecentUnassigned2No theme assigned"`,
    );
  });

  it("expands a group and shows its table rows", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isLoading: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    // Expand accordion
    fireEvent.click(screen.getByText("Unassigned"));

    // Now the inner table exists
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(1);

    // Rows: 1 header + 2 data rows
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getByText("Test snippet 1")).toBeInTheDocument();
    expect(screen.getByText("Test snippet 2")).toBeInTheDocument();
  });

  it("calls delete mutation when delete button clicked (after expanding)", () => {
    const mockMutation = { mutate: vi.fn(), isPending: false };
    mockDeleteSnippetMutation.mockReturnValue(mockMutation as any);

    mockGetSnippetsQuery.mockReturnValue({
      isLoading: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    fireEvent.click(screen.getByText("Unassigned"));

    const deleteButtons = screen.getAllByLabelText(/delete snippet/i);
    expect(deleteButtons).toHaveLength(2);

    fireEvent.click(deleteButtons[0]);

    // because of createdAt sorting desc, id "2" should be first
    expect(mockMutation.mutate).toHaveBeenCalledWith({ id: "2" });
  });

  it("does not call delete mutate when mutation is pending", () => {
    const pendingMutation = { mutate: vi.fn(), isPending: true };
    mockDeleteSnippetMutation.mockReturnValue(pendingMutation as any);

    mockGetSnippetsQuery.mockReturnValue({
      isLoading: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    fireEvent.click(screen.getByText("Unassigned"));

    const deleteButtons = screen.getAllByLabelText(/delete snippet/i);
    fireEvent.click(deleteButtons[0]);

    expect(pendingMutation.mutate).not.toHaveBeenCalled();
    expect(deleteButtons[0]).toBeDisabled();
  });

  it("handles empty snippet list (no groups rendered)", () => {
    mockGetSnippetsQuery.mockReturnValue({
      isLoading: false,
      data: [],
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    // No groups
    expect(screen.queryByText("Unassigned")).not.toBeInTheDocument();
    // No table because nothing to expand
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    expect(textSnapshot()).toMatchInlineSnapshot(`"You have no snippetsCapture something interesting to start building your knowledge base.Create snippet"`);
  });
});
