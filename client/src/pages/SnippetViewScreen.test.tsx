import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SnippetViewScreen from "./SnippetViewScreen";
import { useRoute } from "wouter";

// --- Mock wouter ---
vi.mock("wouter", async () => {
  const actual: any = await vi.importActual("wouter");
  return {
    ...actual,
    useRoute: vi.fn(),
    Link: ({ href, children, ...rest }: any) => (
      <a href={href} {...rest}>
        {children}
      </a>
    ),
  };
});

const mockUseRoute = vi.mocked(useRoute);

// ✅ hoisted query mock
const mockUseQuery = vi.hoisted(() => vi.fn());

// --- Mock trpc ---
vi.mock("@/lib/trpc", () => ({
  trpc: {
    snippets: {
      getSnippetById: {
        useQuery: mockUseQuery,
      },
    },
  },
}));

describe("SnippetViewScreen", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockUseRoute.mockReset();
  });

  it("shows loading state", () => {
    mockUseRoute.mockReturnValue([true, { id: "123" }] as any);

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    });

    render(<SnippetViewScreen />);

    expect(screen.getByText(/loading snippet/i)).toBeInTheDocument();
  });

  it("shows not found when error or no data", () => {
    mockUseRoute.mockReturnValue([true, { id: "missing" }] as any);

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("NOT_FOUND"),
    });

    render(<SnippetViewScreen />);

    expect(screen.getByText(/snippet not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go back/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders snippet content and edit link", () => {
    mockUseRoute.mockReturnValue([true, { id: "abc" }] as any);

    mockUseQuery.mockReturnValue({
      data: {
        id: "abc",
        content: "Hello world\nSecond line",
        tags: ["javascript", "react"],
        createdAt: new Date("2026-01-30T10:00:00Z"),
        // include these only if your component expects them; otherwise remove
        // updatedAt: new Date("2026-01-31T10:00:00Z"),
        sourceUrl: null,
        sourceTitle: null,
        sourceHost: null,
        themeId: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<SnippetViewScreen />);

    expect(screen.getByText(/hello world/i)).toBeInTheDocument();
    expect(screen.getByText(/second line/i)).toBeInTheDocument();

    expect(screen.getByRole("link", { name: /edit/i })).toHaveAttribute(
      "href",
      "/snippets/abc/edit",
    );

    expect(screen.getByRole("link", { name: /#javascript/i })).toHaveAttribute(
      "href",
      "/?tag=javascript",
    );
    expect(screen.getByRole("link", { name: /#react/i })).toHaveAttribute(
      "href",
      "/?tag=react",
    );
  });

  it("calls getSnippetById with the id from the route", () => {
    mockUseRoute.mockReturnValue([true, { id: "xyz" }] as any);

    mockUseQuery.mockReturnValue({
      data: {
        id: "xyz",
        content: "test",
        tags: [],
        createdAt: new Date(),
        sourceUrl: null,
        sourceTitle: null,
        sourceHost: null,
        themeId: null,
      },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<SnippetViewScreen />);

    expect(mockUseQuery).toHaveBeenCalledTimes(1);
    expect(mockUseQuery).toHaveBeenCalledWith(
      { id: "xyz" },
      expect.objectContaining({ enabled: true }),
    );
  });

  it("does not query when route id is missing", () => {
    mockUseRoute.mockReturnValue([false, null] as any);

    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });

    render(<SnippetViewScreen />);

    expect(mockUseQuery).toHaveBeenCalledTimes(1);
    const call = (mockUseQuery as any).mock.calls[0];
    expect(call[1]).toEqual(expect.objectContaining({ enabled: false }));
  });
});
