import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";

interface SubNavItem {
  linkName: string;
  href: string;
}

const SUB_NAV_ITEMS: SubNavItem[] = [
  { linkName: "Overview", href: "/horizon/overview" },
  { linkName: "Themes", href: "/themes" },
  { linkName: "Scenarios", href: "/horizon/scenarios" },
  { linkName: "Signals", href: "/horizon/signals" },
  { linkName: "Updates", href: "/horizon/updates" },
  { linkName: "Reports", href: "/horizon/reports" },
  { linkName: "Intel Feed", href: "/intel/feed" },
  { linkName: "Events", href: "/intel/events" },
];

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SubNavigationBar() {
  const { isAuthenticated } = useSession();
  const [pathname] = useLocation();

  if (!isAuthenticated) return null;

  return (
    <div className="sticky top-14 z-30 w-full border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-10 items-center overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
          {SUB_NAV_ITEMS.map((item) => {
            const isActive = isActiveRoute(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors shrink-0",
                  "hover:bg-muted/60",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
                data-testid={`subnav-link-${item.href.replace(/\//g, "-").replace(/^-/, "")}`}
              >
                {item.linkName}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
