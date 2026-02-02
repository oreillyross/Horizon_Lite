import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {Mock} from "vitest"
import SnippetViewScreen from "./SnippetViewScreen";
import { trpc } from "@/lib/trpc";
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

// ✅ This is now the mocked vi.fn()
const mockUseRoute = vi.mocked(useRoute) as unknown as Mock;

// --- Mock trpc ---
vi.mock("@/lib/trpc", () => {
  return {
    trpc: {
      getSnippetById: {
        useQuery: vi.fn(),
      },
    },
  };
});

describe("SnippetViewScreen", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state", () => {
    mockUseRoute.mockReturnValue([true, { id: "123" }] as any);

    trpc.getSnippetById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as any);

    render(<SnippetViewScreen />);

    expect(screen.getByText(/loading snippet/i)).toBeInTheDocument();
  });

  it("shows not found when error or no data", () => {
    mockUseRoute.mockReturnValue([true, { id: "missing" }] as any);

    trpc.getSnippetById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("NOT_FOUND"),
    } as any);

    render(<SnippetViewScreen />);

    expect(screen.getByText(/snippet not found/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go back/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("renders snippet content and edit link", () => {
    mockUseRoute.mockReturnValue([true, { id: "abc" }] as any);

    trpc.getSnippetById.useQuery.mockReturnValue({
      data: {
        id: "abc",
        content: "Hello world\nSecond line",
        tags: ["javascript", "react"],
        createdAt: new Date("2026-01-30T10:00:00Z"),
        updatedAt: new Date("2026-01-31T10:00:00Z"),
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
      "/snippets/abc/edit"
    );

    expect(screen.getByRole("link", { name: /#javascript/i })).toHaveAttribute(
      "href",
      "/?tag=javascript"
    );
    expect(screen.getByRole("link", { name: /#react/i })).toHaveAttribute(
      "href",
      "/?tag=react"
    );
  });

  it("calls getSnippetById with the id from the route", () => {
    mockUseRoute.mockReturnValue([true, { id: "xyz" }] as any);

    trpc.getSnippetById.useQuery.mockReturnValue({
      data: { id: "xyz", content: "test", tags: [], createdAt: new Date() },
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<SnippetViewScreen />);

    expect(trpc.getSnippetById.useQuery).toHaveBeenCalledTimes(1);
    expect(trpc.getSnippetById.useQuery).toHaveBeenCalledWith(
      { id: "xyz" },
      expect.objectContaining({ enabled: true })
    );
  });

  it("does not query when route id is missing", () => {
    mockUseRoute.mockReturnValue([false, null] as any);

    trpc.getSnippetById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    } as any);

    render(<SnippetViewScreen />);

    expect(trpc.getSnippetById.useQuery).toHaveBeenCalled();
    const call = (trpc.getSnippetById.useQuery as any).mock.calls[0];
    expect(call[1]).toEqual(expect.objectContaining({ enabled: false }));
  });
});
