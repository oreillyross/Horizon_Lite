import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Router } from "wouter";
import { memoryLocation } from "wouter/memory-location";
import NavigationBar from "./NavigationBar";

const navItems = [
  { linkName: "Home", href: "/" },
  { linkName: "Snippets", href: "/snippet/show" },
  { linkName: "Create", href: "/snippet/create" },
  { linkName: "Profile", href: "/profile" },
];

vi.mock("@/components/GlobalSearch", () => ({
  GlobalSearch: () => null,
  default: () => null,
}));

function renderWithRouter(initialPath: string) {
  const { hook } = memoryLocation({ path: initialPath });
  return render(
    <Router hook={hook}>
      <NavigationBar items={navItems} />
    </Router>,
  );
}

describe("NavigationBar", () => {
  it("highlights Home link when on / route", () => {
    renderWithRouter("/");

    const homeLink = screen.getByTestId("nav-link-");
    expect(homeLink).toHaveClass("bg-muted");
    expect(homeLink).toHaveClass("text-foreground");

    const snippetsLink = screen.getByTestId("nav-link-snippet-show");
    expect(snippetsLink).not.toHaveClass("bg-muted");
    expect(snippetsLink).toHaveClass("text-muted-foreground");
  });

  it("highlights Snippets link when on /snippet/show route", () => {
    renderWithRouter("/snippet/show");

    const snippetsLink = screen.getByTestId("nav-link-snippet-show");
    expect(snippetsLink).toHaveClass("bg-muted");
    expect(snippetsLink).toHaveClass("text-foreground");

    const homeLink = screen.getByTestId("nav-link-");
    expect(homeLink).not.toHaveClass("bg-muted");
  });

  it("highlights Create link when on /snippet/create route", () => {
    renderWithRouter("/snippet/create");

    const createLink = screen.getByTestId("nav-link-snippet-create");
    expect(createLink).toHaveClass("bg-muted");
    expect(createLink).toHaveClass("text-foreground");

    const snippetsLink = screen.getByTestId("nav-link-snippet-show");
    expect(snippetsLink).not.toHaveClass("bg-muted");
  });

  it("shows no highlight on unknown routes", () => {
    renderWithRouter("/unknown");

    const homeLink = screen.getByTestId("nav-link-");
    const snippetsLink = screen.getByTestId("nav-link-snippet-show");
    const createLink = screen.getByTestId("nav-link-snippet-create");
    const profileLink = screen.getByTestId("nav-link-profile");

    expect(homeLink).not.toHaveClass("bg-muted");
    expect(snippetsLink).not.toHaveClass("bg-muted");
    expect(createLink).not.toHaveClass("bg-muted");
    expect(profileLink).not.toHaveClass("bg-muted");
  });

  it("renders all navigation items", () => {
    renderWithRouter("/");

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Snippets")).toBeInTheDocument();
    expect(screen.getByText("Create")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("highlights Snippets link for nested routes under /snippet/show", () => {
    renderWithRouter("/snippet/show/123");

    const snippetsLink = screen.getByTestId("nav-link-snippet-show");
    expect(snippetsLink).toHaveClass("bg-muted");
    expect(snippetsLink).toHaveClass("text-foreground");
  });

  it("highlights Create link for nested routes under /snippet/create", () => {
    renderWithRouter("/snippet/create/new");

    const createLink = screen.getByTestId("nav-link-snippet-create");
    expect(createLink).toHaveClass("bg-muted");
    expect(createLink).toHaveClass("text-foreground");
  });

  it("does not highlight Home for other root-level paths", () => {
    renderWithRouter("/other");

    const homeLink = screen.getByTestId("nav-link-");
    expect(homeLink).not.toHaveClass("bg-muted");
  });

  it("has CSS transition classes for smooth highlighting", () => {
    renderWithRouter("/");

    const homeLink = screen.getByTestId("nav-link-");
    expect(homeLink).toHaveClass("transition-colors");
    // duration class isn't set explicitly; we only assert the base transition is present.
  });
});
