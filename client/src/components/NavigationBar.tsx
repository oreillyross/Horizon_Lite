"use client";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavItem {
  linkName: string;
  href: string;
}

interface NavigationBarProps {
  items: NavItem[];
}

function isActiveRoute(pathname: string, href: string): boolean {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(href + '/');
}

export default function NavigationBar({ items }: NavigationBarProps) {
  const [pathname] = useLocation();

  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <div className="text-xl font-bold">Horizon Lite</div>
      <div className="flex items-center space-x-2">
        {items.map((item) => {
          const isActive = isActiveRoute(pathname, item.href);
          return (
            <Button
              key={item.href}
              asChild
              variant="ghost"
              className={cn(
                "font-medium transition-colors duration-200",
                isActive ? "bg-blue-500 text-white hover:bg-blue-600" : "hover:bg-blue-200"
              )}
              size="sm"
              data-testid={`nav-link-${item.href.replace(/\//g, '-').replace(/^-/, '')}`}
            >
              <Link href={item.href}>{item.linkName}</Link>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
