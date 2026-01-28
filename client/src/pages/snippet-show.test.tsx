import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, beforeEach, expect, it, vi } from "vitest";
import SnippetTable from "./snippet-show";
import type { Snippet } from "./snippet-show";

// Mock

const mockSetData = vi.fn();

const mockTrpc = vi.hoisted(() => ({
  useUtils: vi.fn(() => ({
    getSnippets: {
      setData: mockSetData,
    },
  })),
  getSnippets: {
    useQuery: vi.fn(),
  },
  deleteSnippet: {
    useMutation: vi.fn(),
  },
}));

const mockSnippets: Snippet[] = [
  {
    id: "1",
    createdAt: new Date("2026-01-23"),
    content: "Test snippet 1",
    tags: ["javascript", "react"],
  },
  {
    id: "2",
    createdAt: new Date("2026-01-23"),
    content: "Test snippet 2",
    tags: ["typescript"],
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
  isPending: boolean,
};

describe("SnippetTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);

     mockMutation = {
      mutate: vi.fn(),
      isPending: false,
    };

    mockTrpc.deleteSnippet.useMutation.mockReturnValue(mockMutation as any);
  });


  it("renders loading state while fetching snippets", () => {
    mockTrpc.getSnippets.useQuery.mockReturnValue({
      isLoading: true,
      data: undefined,
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders snippet table with data", () => {
    mockTrpc.getSnippets.useQuery.mockReturnValue({
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
    mockTrpc.getSnippets.useQuery.mockReturnValue({
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
    mockTrpc.getSnippets.useQuery.mockReturnValue({
      isPending: false,
      data: mockSnippets,
      refetch: vi.fn(),
    } as any);

    const mockMutation = {
      mutate: vi.fn(),
      isPending: true,
    };
    mockTrpc.deleteSnippet.useMutation.mockReturnValue(mockMutation as any);

    renderWithQueryClient(<SnippetTable />);

    const trashIcons = screen.getAllByLabelText("Delete snippet");

    fireEvent.click(trashIcons[0]);
    expect(mockMutation.mutate).not.toHaveBeenCalled();
  });

  it("handles empty snippet list", () => {
    mockTrpc.getSnippets.useQuery.mockReturnValue({
      isLoading: false,
      data: [],
      refetch: vi.fn(),
    } as any);

    renderWithQueryClient(<SnippetTable />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(1); // header only
  });
});
