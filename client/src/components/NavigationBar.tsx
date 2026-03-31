"use client";

import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/GlobalSearch";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function UserAvatar({ initials }: { initials: string }) {
  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full",
        "bg-muted text-foreground text-xs font-semibold select-none cursor-pointer",
        "border border-border",
      )}
    >
      {initials}
    </div>
  );
}

function getInitials(user: { username?: string; email?: string } | null | undefined): string {
  const name = user?.username ?? user?.email ?? "?";
  return name.slice(0, 2).toUpperCase();
}

export default function NavigationBar() {
  const { user, isLoading, isAuthenticated } = useSession();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="text-base font-semibold tracking-tight">
              Horizon Lite
            </div>
          </Link>

          {/* Search — hidden on xs, shown on sm+ */}
          <div className="hidden sm:flex flex-1 justify-center">
            <div className="w-full max-w-xl">
              <GlobalSearch />
            </div>
          </div>

          {/* Auth controls */}
          <div className="flex items-center gap-2 shrink-0">
            {isLoading ? null : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button aria-label="User menu">
                    <UserAvatar initials={getInitials(user)} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {user?.role === "admin" && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/admin">Admin</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => logoutMutation.mutate()}
                    className="text-destructive focus:text-destructive"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center gap-3 text-sm">
                <Link
                  href="/"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="rounded-md bg-primary px-3 py-1.5 text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden pb-3">
          <GlobalSearch />
        </div>
      </nav>
    </header>
  );
}
