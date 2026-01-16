# Feature: Simple Clean Navigation Bar

## Description
A reusable, clean-looking navbar component that accepts an array of strings and renders a flex-based navigation menu using shadcn/ui components.


### Requirements
- **Layout**: Flexbox, evenly spaced items (`justify-between` or `space-x-4`)
- **Components**: shadcn `Button` components (ghost variant for nav links)
- **Responsive**: Mobile collapses to hamburger menu (future)
- **Styling**: Clean, minimal, matches shadcn theme
- **Active state**: Optional `activeItem?: string` prop for current page highlight

### Example Usage
```tsx
<NavigationBar 
  items={["Home", "Snippets", "Tags", "Profile"]} 
  activeItem="Snippets" 
/>

### Visual mockup
  
[Logo]    Home  Snippets  Tags  Profile    [Theme Toggle]


## Implementation (navigation-bar.tsx)
```tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavigationBarProps {
  items: string[];
  activeItem?: string;
}

export function NavigationBar({ items, activeItem }: NavigationBarProps) {
  return (
    <nav className="flex items-center justify-between p-4 border-b">
      <div className="text-xl font-bold">Horizon Lite</div>
      <div className="flex items-center space-x-2">
        {items.map((item) => (
          <Button
            key={item}
            variant={activeItem === item ? "default" : "ghost"}
            className="font-medium"
            size="sm"
          >
            {item}
          </Button>
        ))}
      </div>
    </nav>
  );
}


