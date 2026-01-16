"use client";
import {Link} from "wouter";
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

export default function NavigationBar({ items, activeItem }: NavigationBarProps) {
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
