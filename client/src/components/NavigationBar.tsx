// Exact code from your spec ✅
import { Button } from "@/components/ui/button";


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
