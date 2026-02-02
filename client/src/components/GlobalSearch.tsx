import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Search, CornerDownLeft } from "lucide-react";

function fmtDate(d?: Date | string | null) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function GlobalSearch() {
  const [, navigate] = useLocation();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Cmd/Ctrl+K opens, Esc closes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // tiny debounce so we don’t spam the server
  const [dq, setDq] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 150);
    return () => clearTimeout(t);
  }, [q]);

  const isMac = useMemo(
    () => navigator.platform.toLowerCase().includes("mac"),
    []
  );

  // ✅ THIS is where you call it
  const searchQuery = trpc.globalSearch.useQuery(
    { q: dq || "x", limit: 20 },
    { enabled: open && dq.length > 0, staleTime: 10_000 }
  );

  const results = searchQuery.data ?? [];

  const onPick = (id: string) => {
    setOpen(false);
    setQ("");
    navigate(`/snippet/${id}`); // change if your route differs
  };

  return (
    <>
      {/* Optional: Topbar button to open */}
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
        <span>Search…</span>
        <span className="ml-2 rounded border px-1.5 py-0.5 text-xs">
          {isMac ? "⌘K" : "Ctrl K"}
        </span>
      </button>

      {/* Dialog */}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-xl border bg-background shadow-xl"
            onMouseDown={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-2 border-b p-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search snippets and tags…"
                className="h-10 w-full bg-transparent text-sm outline-none"
              />
              {searchQuery.isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : null}
            </div>

            <div className="max-h-[60vh] overflow-auto">
              {dq.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">
                  Type to search. Press <span className="font-mono">Esc</span> to
                  close.
                </div>
              ) : results.length === 0 && !searchQuery.isFetching ? (
                <div className="p-4 text-sm text-muted-foreground">
                  No results.
                </div>
              ) : (
                <ul className="divide-y">
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onPick(r.id)}
                        className="w-full px-4 py-3 text-left hover:bg-muted"
                      >
                        <div className="text-sm leading-snug">{r.excerpt}</div>

                        {/* compact single-line meta: tags • last updated */}
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {Array.isArray(r.tags) && r.tags.length > 0 ? (
                            <div className="inline-flex flex-wrap gap-1">
                              {r.tags.slice(0, 6).map((t: string) => (
                                <span
                                  key={t}
                                  className="rounded border px-1.5 py-0.5 font-mono"
                                >
                                  {t}
                                </span>
                              ))}
                              {r.tags.length > 6 ? (
                                <span>+{r.tags.length - 6}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="font-mono">no-tags</span>
                          )}

                          <span>•</span>
                          <span>
                            Last: {fmtDate((r as any).updatedAt ?? r.createdAt)}
                          </span>

                          <span className="ml-auto inline-flex items-center gap-1">
                            <CornerDownLeft className="h-3.5 w-3.5" />
                            Enter
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t p-3 text-xs text-muted-foreground">
              <span className="font-mono">Esc</span> closes •{" "}
              <span className="font-mono">{isMac ? "⌘K" : "Ctrl K"}</span> opens
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
