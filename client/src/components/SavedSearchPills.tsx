import { useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SavedSearchPillsProps {
  pills: string[];
  activeQuery: string;
  onSelect: (term: string) => void;
  onRemove: (term: string) => void;
}

export function SavedSearchPills({ pills, activeQuery, onSelect, onRemove }: SavedSearchPillsProps) {
  const groupRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  if (pills.length === 0) return null;

  function focusAdjacentOrSearch(term: string) {
    const index = pills.indexOf(term);
    const remaining = pills.filter((p) => p !== term);
    if (remaining.length === 0) {
      document.getElementById("gdelt-search")?.focus();
      return;
    }
    const nextTerm = pills[index + 1] ?? remaining[remaining.length - 1];
    const target = groupRefs.current.get(nextTerm);
    target?.querySelector<HTMLButtonElement>("[data-pill-trigger]")?.focus();
  }

  return (
    <div role="list" aria-label="Saved searches" className="flex flex-wrap gap-2">
      {pills.map((pill) => {
        const isActive = activeQuery === pill;
        return (
          <div key={pill} role="listitem">
            <div
              role="group"
              aria-label={pill}
              ref={(el) => {
                if (el) groupRefs.current.set(pill, el);
                else groupRefs.current.delete(pill);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-xs",
                isActive
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-muted text-muted-foreground border-border",
              )}
            >
              <button
                type="button"
                data-pill-trigger
                aria-pressed={isActive}
                onClick={() => onSelect(pill)}
                className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {pill}
              </button>
              <button
                type="button"
                aria-label={`Remove saved search: ${pill}`}
                onClick={() => {
                  focusAdjacentOrSearch(pill);
                  onRemove(pill);
                }}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-background/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
