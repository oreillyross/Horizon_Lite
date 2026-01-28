import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

import EditSnippetScreen from "./EditSnippetScreen";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";

// ---------- mocks ----------
const mockSetLocation = vi.fn();
const mockMutate = vi.fn();
const mockSetData = vi.fn();

vi.mock("wouter", () => ({
  useParams: vi.fn(),
  useLocation: vi.fn(),
}));

const mockTrpc = vi.hoisted(() => ({
  useUtils: vi.fn(() => ({
    getSnippets: { setData: mockSetData },
  })),
  getSnippets: {
    useQuery: vi.fn(),
  },
  updateSnippet: {
    useMutation: vi.fn(),
  },
}));

vi.mock("@/lib/trpc", () => ({ trpc: mockTrpc }));

function arrangeRoute(id = "1") {
  (useParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ id });
  (useLocation as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
    "/snippet/edit/" + id,
    mockSetLocation,
  ]);
}

function arrangeQuery({
  isLoading = false,
  data = [],
}: {
  isLoading?: boolean;
  data?: any[];
}) {
  mockTrpc.getSnippets.useQuery.mockReturnValue({
    isLoading,
    data,
    error: null,
  });
}

function arrangeMutation({
  isPending = false,
}: {
  isPending?: boolean;
} = {}) {
  mockTrpc.updateSnippet.useMutation.mockImplementation((config: any) => {
    // capture config so tests can call config.onSuccess(...)
    (mockTrpc.updateSnippet.useMutation as any)._config = config;

    return {
      mutate: mockMutate,
      isPending,
      error: null,
    };
  });
}

describe("EditSnippetScreen", () => {
  beforeEach(() => {
    mockSetLocation.mockReset();
    mockMutate.mockReset();
    mockSetData.mockReset();
    mockTrpc.getSnippets.useQuery.mockReset();
    mockTrpc.updateSnippet.useMutation.mockReset();
    mockTrpc.useUtils.mockClear();
    arrangeRoute("1");
  });

  it("shows a loading spinner while snippets are loading", () => {
    arrangeQuery({ isLoading: true, data: undefined as any });
    arrangeMutation();

    const { container } = render(<EditSnippetScreen />);
    // we don't have accessible text for Loader2, so check for the wrapper
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows 'Snippet not found' when id is missing from list", () => {
    arrangeQuery({
      isLoading: false,
      data: [{ id: "2", content: "nope", tags: [] }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    expect(screen.getByText(/snippet not found/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /back to list/i }));
    expect(mockSetLocation).toHaveBeenCalledWith("/snippet/show");
  });

  it("populates the form fields from the snippet", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Hello world", tags: ["js", "react"] }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    const textarea = screen.getByLabelText(/content/i);
    const tagsInput = screen.getByLabelText(/tags/i);

    expect(textarea).toHaveValue("Hello world");
    expect(tagsInput).toHaveValue("js, react");
  });

  it("edits content/tags and calls mutate with parsed tags", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Old", tags: ["a"] }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    fireEvent.change(screen.getByLabelText(/content/i), {
      target: { value: "New content" },
    });

    fireEvent.change(screen.getByLabelText(/tags/i), {
      target: { value: "  ts, react , ,  " },
    });

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate).toHaveBeenCalledWith({
      id: "1",
      content: "New content",
      tags: ["ts", "react"],
    });
  });

  it("disables Save while mutation is pending", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Old", tags: [] }],
    });
    arrangeMutation({ isPending: true });

    render(<EditSnippetScreen />);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("on success: updates cache and navigates back to list", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Old", tags: ["a"] }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    // simulate server returning updated snippet
    const updated = { id: "1", content: "Updated", tags: ["x"] };

    const config = (mockTrpc.updateSnippet.useMutation as any)._config;
    config.onSuccess(updated);

    // 1) cache updated via setData
    expect(mockSetData).toHaveBeenCalledTimes(1);

    // call updater to validate mapping behavior
    const [, updater] = mockSetData.mock.calls[0];
    const next = updater([{ id: "1", content: "Old", tags: ["a"] }]);
    expect(next).toEqual([{ id: "1", content: "Updated", tags: ["x"] }]);

    // 2) navigation
    expect(mockSetLocation).toHaveBeenCalledWith("/snippet/show");
  });

  it("Cancel navigates back to list", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Old", tags: [] }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockSetLocation).toHaveBeenCalledWith("/snippet/show");
  });
});
