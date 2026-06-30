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
    horizon: {
      gdelt: {
        countNew: {
          useQuery: vi.fn(() => ({
            data: { count: 0 },
            isLoading: false,
            error: null,
          })),
        },
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
    expect(screen.queryByText("Overview")).not.toBeInTheDocument();
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
    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Themes")).toBeInTheDocument();
    expect(screen.getByText("Scenarios")).toBeInTheDocument();
    expect(screen.getByText("Signals")).toBeInTheDocument();
    expect(screen.getByText("Updates")).toBeInTheDocument();
    expect(screen.getByText("Reports")).toBeInTheDocument();
    expect(screen.getByText("Intel Feed")).toBeInTheDocument();
    expect(screen.getByText("Events")).toBeInTheDocument();
    expect(screen.getByText("Snippets")).toBeInTheDocument();
    expect(screen.getByText("GDELT Triage")).toBeInTheDocument();
  });

  it("highlights Snippets link when on /horizon/snippets", () => {
    renderSubNavWithRouter("/horizon/snippets");

    const snippetsLink = screen.getByTestId("subnav-link-horizon-snippets");
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

  it("highlights Events link when on /intel/events", () => {
    renderSubNavWithRouter("/intel/events");

    const eventsLink = screen.getByTestId("subnav-link-intel-events");
    expect(eventsLink).toHaveClass("bg-muted");
    expect(eventsLink).toHaveClass("text-foreground");
  });

  it("highlights Overview link when on /horizon/overview", () => {
    renderSubNavWithRouter("/horizon/overview");

    const overviewLink = screen.getByTestId("subnav-link-horizon-overview");
    expect(overviewLink).toHaveClass("bg-muted");
    expect(overviewLink).toHaveClass("text-foreground");
  });

  it("highlights Intel Feed link when on /intel/feed", () => {
    renderSubNavWithRouter("/intel/feed");

    const intelLink = screen.getByTestId("subnav-link-intel-feed");
    expect(intelLink).toHaveClass("bg-muted");
    expect(intelLink).toHaveClass("text-foreground");
  });

  it("highlights GDELT Triage link when on /horizon/gdelt/triage", () => {
    renderSubNavWithRouter("/horizon/gdelt/triage");

    const triageLink = screen.getByTestId("subnav-link-horizon-gdelt-triage");
    expect(triageLink).toHaveClass("bg-muted");
    expect(triageLink).toHaveClass("text-foreground");
  });

  it("highlights Snippets for nested routes under /horizon/snippets", () => {
    renderSubNavWithRouter("/horizon/snippets/123");

    const snippetsLink = screen.getByTestId("subnav-link-horizon-snippets");
    expect(snippetsLink).toHaveClass("bg-muted");
    expect(snippetsLink).toHaveClass("text-foreground");
  });

  it("shows no highlight on unknown routes", () => {
    renderSubNavWithRouter("/unknown");

    expect(screen.getByTestId("subnav-link-horizon-snippets")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-themes")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-intel-events")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-horizon-overview")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-intel-feed")).not.toHaveClass("bg-muted");
    expect(screen.getByTestId("subnav-link-horizon-gdelt-triage")).not.toHaveClass("bg-muted");
  });

  it("has CSS transition classes for smooth highlighting", () => {
    renderSubNavWithRouter("/horizon/snippets");

    const snippetsLink = screen.getByTestId("subnav-link-horizon-snippets");
    expect(snippetsLink).toHaveClass("transition-colors");
  });
});
