
# Feature: Simple Clean Navigation Bar

## Description
A reusable, clean-looking navbar component that accepts an array of link objects and renders a flex-based navigation menu using shadcn/ui components with full linking capability.

## Specification

### Props
```tsx
NavigationBarProps {
  items: Array<{
    linkName: string     // Display text (e.g. "Snippets")
    href: string         // Link destination (e.g. "/snippets")
  }>
  activeItem?: string    // Matches linkName for highlight
  orientation?: "horizontal" | "vertical"  // Default: "horizontal"
}


### Requirements
- **Layout**: Flexbox, evenly spaced items (`justify-between` or `space-x-4`)
- **Components**: shadcn `Button` components (ghost variant for nav links)
- **Responsive**: Mobile collapses to hamburger menu (future)
- **Styling**: Clean, minimal, matches shadcn theme
- **Active state**: Optional `activeItem?: string` prop for current page highlight

<NavigationBar 
  items={[
    { linkName: "Home", href: "/" },
    { linkName: "Snippets", href: "/snippets" },
    { linkName: "Tags", href: "/tags" },
    { linkName: "Profile", href: "/profile" }
  ]} 
  activeItem="Snippets" 
/>


### Visual mockup
  
[Logo]    Home  Snippets  Tags  Profile    [Theme Toggle]

### Implementation
  "use client";
  import Link from "next/link";
  import { Button } from "@/components/ui/button";
  import { cn } from "@/lib/utils";

  interface NavItem {
    linkName: string;
    href: string;
  }

  interface NavigationBarProps {
    items: NavItem[];
    activeItem?: string;
  }

  export function NavigationBar({ items, activeItem }: NavigationBarProps) {
    return (
      <nav className="flex items-center justify-between p-4 border-b">
        <div className="text-xl font-bold">Horizon Lite</div>
        <div className="flex items-center space-x-2">
          {items.map((item) => (
            <Button
              key={item.href}
              asChild
              variant={activeItem === item.linkName ? "default" : "ghost"}
              className="font-medium"
              size="sm"
            >
              <Link href={item.href}>{item.linkName}</Link>
            </Button>
          ))}
        </div>
      </nav>
    );
  }

