"use client";

import { Link, useLocation } from "wouter";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";
import { Menu, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";

interface NavItem {
  linkName: string;
  href: string;
}

interface NavigationBarProps {
  items: NavItem[];
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function getActiveThemeId(pathname: string): string | null {
  // matches /theme/<id> and /theme/<id>/...
  const m = pathname.match(/^\/theme\/([^/]+)(?:\/|$)/);
  return m?.[1] ?? null;
}

export default function NavigationBar({ items }: NavigationBarProps) {
  const { user, isLoading, isAuthenticated } = useSession();
  console.log(isAuthenticated)
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });
  const [pathname] = useLocation();
  const [open, setOpen] = useState(false);

  const themeId = useMemo(() => getActiveThemeId(pathname), [pathname]);

  const navItems: NavItem[] = useMemo(() => {
    const base = [...items];

    if (themeId && !base.some((i) => i.href === `/theme/${themeId}`)) {
      base.push({ linkName: "Current theme", href: `/theme/${themeId}` });
    }

    const order = [
      "/",
      "/snippet/show",
      "/snippet/create",
      "/tags/show",
      "/themes",
    ];
    base.sort((a, b) => {
      const ai = order.indexOf(a.href);
      const bi = order.indexOf(b.href);
      if (ai === -1 && bi === -1) return a.linkName.localeCompare(b.linkName);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    return base;
  }, [items, themeId]);

  const renderLink = (item: NavItem) => {
    const isActive = isActiveRoute(pathname, item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn(
          "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
          "hover:bg-muted/60",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground",
        )}
        data-testid={`nav-link-${item.href.replace(/\//g, "-").replace(/^-/, "")}`}
        onClick={() => setOpen(false)}
      >
        {item.linkName}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="text-base font-semibold tracking-tight">
                Horizon Lite
              </div>
            </Link>
          </div>

          {/* Search (hidden on xs, shown on sm+) */}
          <div className="hidden sm:flex flex-1 justify-center">
            <div className="w-full max-w-xl">
              <GlobalSearch />
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(renderLink)}
            {isLoading ? null : isAuthenticated ? (
              <div className="flex items-center gap-4">
                {user?.role === "admin" && <Link href="/admin">Admin</Link>}

                <button
                  onClick={() => logoutMutation.mutate()}
                  className="text-sm text-muted-foreground"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-4">
                <Link href="/">Login</Link>
                <Link href="/signup">Sign up</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden pb-3">
          <GlobalSearch />
        </div>

        {/* Mobile nav panel */}
        {open ? (
          <div className="md:hidden pb-4">
            <div className="grid gap-1 rounded-md border bg-background p-2">
              {navItems.map((item) => (
                <div key={item.href}>{renderLink(item)}</div>
              ))}
              {isLoading ? null : isAuthenticated ? (
                <div className="flex items-center gap-4">
                  {user?.role === "admin" && <Link href="/admin">Admin</Link>}

                  <button
                    onClick={() => logoutMutation.mutate()}
                    className="text-sm text-muted-foreground"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Link href="/login">Login</Link>
                  <Link href="/signup">Sign up</Link>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}
