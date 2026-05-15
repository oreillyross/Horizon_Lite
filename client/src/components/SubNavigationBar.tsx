import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/useSession";
import { trpc } from "@/lib/trpc";

interface SubNavItem {
  linkName: string;
  href: string;
  badge?: React.ReactNode;
}

const BASE_NAV_ITEMS: Omit<SubNavItem, "badge">[] = [
  { linkName: "Overview", href: "/horizon/overview" },
  { linkName: "Themes", href: "/themes" },
  { linkName: "Scenarios", href: "/horizon/scenarios" },
  { linkName: "Signals", href: "/horizon/signals" },
  { linkName: "Updates", href: "/horizon/updates" },
  { linkName: "Reports", href: "/horizon/reports" },
  { linkName: "Intel Feed", href: "/intel/feed" },
  { linkName: "Events", href: "/intel/events" },
  { linkName: "GDELT Triage", href: "/horizon/gdelt/triage" },
];

function TriageCountBadge() {
  const { data } = trpc.horizon.gdelt.countNew.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  if (!data || data.count === 0) return null;
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
      {data.count > 99 ? "99+" : data.count}
    </span>
  );
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function SubNavigationBar() {
  const { isAuthenticated } = useSession();
  const [pathname] = useLocation();

  if (!isAuthenticated) return null;

  const navItems: SubNavItem[] = BASE_NAV_ITEMS.map((item) =>
    item.href === "/horizon/gdelt/triage"
      ? { ...item, badge: <TriageCountBadge /> }
      : item,
  );

  return (
    <div className="sticky top-14 z-30 w-full border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-10 items-center overflow-x-auto whitespace-nowrap scrollbar-none gap-1">
          {navItems.map((item) => {
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
                {item.badge}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
