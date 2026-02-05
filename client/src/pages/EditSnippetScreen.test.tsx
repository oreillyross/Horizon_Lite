import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

// If EditSnippetScreen renders ThemeSelect and it has its own fetching,
// mock it to keep tests focused + stable.
// Adjust the path to whatever EditSnippetScreen imports.
vi.mock("@/components/ThemeSelect", () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string | null;
    onChange: (v: string | null) => void;
  }) => (
    <label>
      Theme
      <select
        aria-label="Theme"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
      >
        <option value="">None</option>
        <option value="theme-123">Theme 123</option>
      </select>
    </label>
  ),
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

function arrangeMutation({ isPending = false }: { isPending?: boolean } = {}) {
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

// Helper: get updater regardless of setData signature
function getSetDataUpdaterCall(): (prev: any) => any {
  const call = mockSetData.mock.calls[0] ?? [];
  // Common patterns:
  // setData(input, updater)
  if (typeof call[1] === "function") return call[1];
  // setData(updater)
  if (typeof call[0] === "function") return call[0];
  throw new Error(`Expected setData to be called with an updater function.`);
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

    render(<EditSnippetScreen />);

    // Prefer accessible assertion after refactor (if you added aria-label="Loading")
    // If your component doesn't have this label, add it in the component.
    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
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
      data: [{ id: "1", content: "Hello world", tags: ["js", "react"], themeId: null }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    const textarea = screen.getByLabelText(/content/i);
    expect(textarea).toHaveValue("Hello world");

    // If tags are rendered as pills/badges, these should still appear as text.
    expect(screen.getByText("js")).toBeInTheDocument();
    expect(screen.getByText("react")).toBeInTheDocument();

    // ThemeSelect mocked — should default to None (empty) when themeId is null
    expect(screen.getByLabelText("Theme")).toHaveValue("");
  });

  
  it("disables Save while mutation is pending", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Old", tags: [], themeId: null }],
    });
    arrangeMutation({ isPending: true });

    render(<EditSnippetScreen />);

    expect(screen.getByRole("button", { name: /save/i })).toBeDisabled();
  });

  it("on success: updates cache and navigates back to list", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Old", tags: ["a"], themeId: null }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    // simulate server returning updated snippet
    const updated = { id: "1", content: "Updated", tags: ["x"], themeId: null };

    const config = (mockTrpc.updateSnippet.useMutation as any)._config;
    config.onSuccess(updated);

    // 1) cache updated via setData
    expect(mockSetData).toHaveBeenCalledTimes(1);

    const updater = getSetDataUpdaterCall();
    const next = updater([{ id: "1", content: "Old", tags: ["a"], themeId: null }]);
    expect(next).toEqual([{ id: "1", content: "Updated", tags: ["x"], themeId: null }]);

    // 2) navigation
    expect(mockSetLocation).toHaveBeenCalledWith("/snippet/show");
  });

  it("Cancel navigates back to list", () => {
    arrangeQuery({
      data: [{ id: "1", content: "Old", tags: [], themeId: null }],
    });
    arrangeMutation();

    render(<EditSnippetScreen />);

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockSetLocation).toHaveBeenCalledWith("/snippet/show");
  });
});
