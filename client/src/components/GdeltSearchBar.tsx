import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GdeltSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  className?: string;
}

export function GdeltSearchBar({ value, onChange, onClear, className }: GdeltSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleClear() {
    onClear();
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      onClear();
    }
  }

  return (
    <div role="search" className={cn("relative flex items-center", className)}>
      <label htmlFor="gdelt-search" className="sr-only">
        Search articles
      </label>
      <Input
        ref={inputRef}
        id="gdelt-search"
        type="search"
        placeholder="Search titles, actors, countries…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="pr-8"
      />
      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 h-full px-2"
          aria-label="Clear search"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
