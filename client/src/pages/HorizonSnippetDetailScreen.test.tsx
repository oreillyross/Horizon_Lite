import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import HorizonSnippetDetailScreen from "./HorizonSnippetDetailScreen";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    horizon: {
      snippets: {
        getById: { useQuery: vi.fn() },
      },
    },
  },
}));

vi.mock("wouter", () => ({
  useParams: vi.fn(() => ({ id: "snippet-abc" })),
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { trpc } from "@/lib/trpc";
const mockTrpc = trpc as any;

const SNIPPET = {
  id: "snippet-abc",
  quote: "This is the captured quote text.",
  content: "This is the captured quote text.",
  sourceUrl: "https://example.com/article",
  pubDate: "2026-01-15T00:00:00.000Z",
  indicatorId: "ind-1",
  indicatorName: "Diplomatic Pressure",
  analystNotes: "Watch this closely.",
  aiSuggestedIndicatorId: null,
  createdAt: "2026-01-15T08:00:00.000Z",
};

function setupDefault() {
  mockTrpc.horizon.snippets.getById.useQuery.mockReturnValue({
    data: SNIPPET,
    isLoading: false,
    isError: false,
  });
}

describe("HorizonSnippetDetailScreen", () => {
  beforeEach(setupDefault);

  it("renders the quote text", () => {
    render(<HorizonSnippetDetailScreen />);
    expect(screen.getByText("This is the captured quote text.")).toBeInTheDocument();
  });

  it("renders the linked indicator name", () => {
    render(<HorizonSnippetDetailScreen />);
    expect(screen.getByText("Diplomatic Pressure")).toBeInTheDocument();
  });

  it("renders the analyst notes", () => {
    render(<HorizonSnippetDetailScreen />);
    expect(screen.getByText("Watch this closely.")).toBeInTheDocument();
  });

  it("renders the source URL as a link", () => {
    render(<HorizonSnippetDetailScreen />);
    const link = screen.getByRole("link", { name: "https://example.com/article" });
    expect(link).toHaveAttribute("href", "https://example.com/article");
  });

  it("shows loading state", () => {
    mockTrpc.horizon.snippets.getById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });
    const { container } = render(<HorizonSnippetDetailScreen />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows not-found state on error", () => {
    mockTrpc.horizon.snippets.getById.useQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });
    render(<HorizonSnippetDetailScreen />);
    expect(screen.getByText("Snippet not found")).toBeInTheDocument();
  });
});
