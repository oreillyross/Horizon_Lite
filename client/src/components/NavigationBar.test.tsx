import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      logout: {
        useMutation: vi.fn(() => ({
          mutate: vi.fn(),
          mutateAsync: vi.fn(),
          isLoading: false,
          isPending: false,
          error: null,
        })),
      },
    },
  },
}));

vi.mock("@/hooks/useSession", () => ({
  useSession: vi.fn(() => ({
    user: { username: "Jo", role: "user" },
    isLoading: false,
    isAuthenticated: true,
  })),
}));

import NavigationBar from "./NavigationBar";
import SubNavigationBar from "./SubNavigationBar";
import { useSession } from "@/hooks/useSession";

function renderNavWithRouter(initialPath = "/") {
  const { hook } = memoryLocation({ path: initialPath });
  return render(
    <Router hook={hook}>
      <NavigationBar />
    </Router>,
  );
}

function renderSubNavWithRouter(initialPath = "/") {
  const { hook } = memoryLocation({ path: initialPath });
  return render(
    <Router hook={hook}>
      <SubNavigationBar />
    </Router>,
  );
}

// ─── NavigationBar (TopBar) ───────────────────────────────────────────────────

describe("NavigationBar", () => {
  it("renders the brand name", () => {
    renderNavWithRouter("/");
    expect(screen.getByText("Horizon Lite")).toBeInTheDocument();
  });

  it("shows user initials avatar when authenticated", () => {
    renderNavWithRouter("/");
    expect(screen.getByText("JO")).toBeInTheDocument();
  });

  it("shows Sign In and Sign Up links when not authenticated", () => {
    vi.mocked(useSession).mockReturnValueOnce({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    renderNavWithRouter("/");
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Sign Up")).toBeInTheDocument();
  });

  it("does not render page nav links in the top bar", () => {
    renderNavWithRouter("/");
    expect(screen.queryByText("Snippets")).not.toBeInTheDocument();
    expect(screen.queryByText("Themes")).not.toBeInTheDocument();
    expect(screen.queryByText("Trends")).not.toBeInTheDocument();
  });
});

// ─── SubNavigationBar ─────────────────────────────────────────────────────────

describe("SubNavigationBar", () => {
  it("is hidden when user is not authenticated", () => {
    vi.mocked(useSession).mockReturnValueOnce({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    const { container } = renderSubNavWithRouter("/");
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all navigation items", () => {
    renderSubNavWithRouter("/");
    expect(screen.getByText("Snippets")).toBeInTheDocument();
    expect(screen.getByText("Themes")).toBeInTheDocument();
    expect(screen.getByText("Tags")).toBeInTheDocument();
    expect(screen.getByText("Trends")).toBeInTheDocument();
    expect(screen.getByText("Intel Feed")).toBeInTheDocument();
    expect(screen.getByText("Sources")).toBeInTheDocument();
  });

  it("highlights Snippets link when on /snippet/show", () => {
    renderSubNavWithRouter("/snippet/show");

    const snippetsLink = screen.getByTestId("subnav-link-snippet-show");
    expect(snippetsLink).toHaveClass("bg-muted");
    expect(snippetsLink).toHaveClass("text-foreground");

    const themesLink = screen.getByTestId("subnav-link-themes");
    expect(themesLink).not.toHaveClass("bg-muted");
    expect(themesLink).toHaveClass("text-muted-foreground");
  });

  it("highlights Themes link when on /themes", () => {
    renderSubNavWithRouter("/themes");

    const themesLink = screen.getByTestId("subnav-link-themes");
    expect(themesLink).toHaveClass("bg-muted");
    expect(themesLink).toHaveClass("text-foreground");
  });

  it("highlights Tags link when on /tags/show", () => {
    renderSubNavWithRouter("/tags/show");

    const tagsLink = screen.getByTestId("subnav-link-tags-show");
    expect(tagsLink).toHaveClass("bg-muted");
    expect(tagsLink).toHaveClass("text-foreground");
  });

  it("highlights Trends link when on /horizon/overview", () => {
    renderSubNavWithRouter("/horizon/overview");

    const trendsLink = screen.getByTestId("subnav-link-horizon-overview");
    expect(trendsLink).toHaveClass("bg-muted");
    expect(trendsLink).toHaveClass("text-foreground");
  });

  it("highlights Intel Feed link when on /intel/feed", () => {
    renderSubNavWithRouter("/intel/feed");

    const intelLink = screen.getByTestId("subnav-link-intel-feed");
    expect(intelLink).toHaveClass("bg-muted");
    expect(intelLink).toHaveClass("text-foreground");
  });

  it("highlights Sources link when on /sources/recent", () => {
    renderSubNavWithRouter("/sources/recent");

    const sourcesLink = screen.getByTestId("subnav-link-sources-recent");
    expect(sourcesLink).toHaveClass("bg-muted");
    expect(sourcesLink).toHaveClass("text-foreground");
  });

  it("highlights Snippets for nested routes under /snippet/show", () => {
    renderSubNavWithRouter("/snippet/show/123");

    const snippetsLink = screen.getByTestId("subnav-link-snippet-show");
    expect(snippetsLink).toHaveClass("bg-muted");
    expect(snippetsLink).toHaveClass("text-foreground");
  });

  it("shows no highlight on unknown routes", () => {
    renderSubNavWithRouter("/unknown");

    expect(screen.getByTestId("subnav-link-snippet-show")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-themes")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-tags-show")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-horizon-overview")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-intel-feed")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-sources-recent")).not.toHaveClass("bg-muted");
  });

  it("has CSS transition classes for smooth highlighting", () => {
    renderSubNavWithRouter("/snippet/show");

    const snippetsLink = screen.getByTestId("subnav-link-snippet-show");
    expect(snippetsLink).toHaveClass("transition-colors");
  });
});
