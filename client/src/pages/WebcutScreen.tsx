import { useMemo, useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function normalizeUrl(input: string) {
  const s = input.trim();
  if (!s) return "";
  // Convenience: allow "example.com" -> "https://example.com"
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function hostFromUrl(u: string) {
  try {
    return new URL(u).host;
  } catch {
    return "";
  }
}

export default function WebCutScreen() {
  const isMobile = useIsMobile();

  // --- selection / popover state ---
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  const utils = trpc.useUtils();

  useEffect(() => {
    if (!popoverOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closePopover();
    }

    function onPointerDownOutside(e: Event) {
      // click/tap outside closes
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // if click/tap is inside the popover, ignore
      const pop = document.querySelector('[aria-label="WebCut capture"]');
      if (pop && pop.contains(target)) return;

      closePopover();
    }

    function onScroll() {
      // scroll usually makes the rect stale; simplest is close
      closePopover();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDownOutside);
    window.addEventListener("touchstart", onPointerDownOutside);
    window.addEventListener("scroll", onScroll, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDownOutside);
      window.removeEventListener("touchstart", onPointerDownOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [popoverOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // create snippet mutation
  const createSnippet = trpc.snippets.createSnippet.useMutation({
    onSuccess: async () => {
      // refresh lists so "recently added" shows it
      // (adjust these to your actual query names)
      await utils.snippets.getSnippets?.invalidate?.();
      await utils.snippets.getTags?.invalidate?.();

      // close UI
      setPopoverOpen(false);
      setSelectedText("");
      setAnchor(null);
    },
  });

  function closePopover() {
    setPopoverOpen(false);
    setSelectedText("");
    setAnchor(null);
  }

  function isSelectionInsideReader(sel: Selection, readerEl: HTMLElement) {
    const node = sel.anchorNode;
    if (!node) return false;
    const el =
      node.nodeType === Node.ELEMENT_NODE
        ? (node as Element)
        : node.parentElement;
    return !!el && readerEl.contains(el);
  }

  function getSelectionTextAndAnchor(readerEl: HTMLElement) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    if (!isSelectionInsideReader(sel, readerEl)) return null;

    const text = sel.toString().replace(/\s+/g, " ").trim();
    if (!text || text.length < 3) return null;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // If rect is empty (sometimes happens), fall back to mouse position handled elsewhere
    const x = rect.left + rect.width / 2;
    const y = rect.top; // place popover above selection

    return { text, x, y };
  }

  function getPopoverStyle(pos: { x: number; y: number }) {
    const POPOVER_HALF_WIDTH = 120;
    const PADDING = 8;
    const vw = window.innerWidth;

    let left = Math.round(pos.x);
    const top = Math.round(pos.y) - 10;

    // Clamp horizontal to keep popover on screen
    left = Math.max(
      POPOVER_HALF_WIDTH + PADDING,
      Math.min(left, vw - POPOVER_HALF_WIDTH - PADDING),
    );

    // If popover would go above viewport, show below selection instead
    if (top < 60) {
      return {
        position: "fixed" as const,
        left,
        top: Math.round(pos.y) + 30,
        transform: "translate(-50%, 0%)",
        zIndex: 50,
      };
    }

    return {
      position: "fixed" as const,
      left,
      top,
      transform: "translate(-50%, -100%)",
      zIndex: 50,
    };
  }

  const [urlInput, setUrlInput] = useState("");
  const [loadedUrl, setLoadedUrl] = useState<string>("");

  const normalized = useMemo(() => normalizeUrl(urlInput), [urlInput]);
  const host = useMemo(() => hostFromUrl(loadedUrl), [loadedUrl]);

  const readable = trpc.webcut.fetchReadable.useQuery(
    { url: loadedUrl },
    { enabled: !!loadedUrl },
  );

  // Touch-based selection detection via selectionchange (fires on all platforms)
  useEffect(() => {
    if (!readable.data?.contentHtml) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function handleSelectionChange() {
      if (debounceTimer) clearTimeout(debounceTimer);

      debounceTimer = setTimeout(() => {
        const readerEl = document.getElementById("webcut-reader");
        if (!readerEl) return;

        const res = getSelectionTextAndAnchor(readerEl);
        if (!res) {
          // Don't close if popover is already open — tapping "Add snippet"
          // can momentarily clear the selection on mobile
          return;
        }

        setSelectedText(res.text);
        setAnchor({ x: res.x, y: res.y });
        setPopoverOpen(true);
      }, 300);
    }

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [readable.data?.contentHtml]); // eslint-disable-line react-hooks/exhaustive-deps

  function onGo() {
    const u = normalizeUrl(urlInput);
    if (!u) return;
    setLoadedUrl(u);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onGo();
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold">WebCut</div>
            <div className="text-xs text-muted-foreground">
              capture snippets from web text
            </div>
          </div>

          <div className="flex-1" />

          <Link
            href="/snippets"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Snippets
          </Link>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div className="flex items-center gap-2">
            <input
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2"
              placeholder="Paste a URL (e.g. https://example.com)"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="WebCut URL"
            />
            <button
              className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              onClick={onGo}
              disabled={!normalized}
            >
              Go
            </button>
          </div>

          {normalized && !loadedUrl && (
            <div className="mt-2 text-xs text-muted-foreground">
              Will load: <span className="font-mono">{normalized}</span>
            </div>
          )}

          {loadedUrl && (
            <div className="mt-2 text-xs text-muted-foreground">
              Loaded: <span className="font-mono">{loadedUrl}</span>
              {host ? <span className="ml-2">({host})</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* Reader scaffold */}
      <main className="mx-auto max-w-6xl px-4 py-6">
        {!loadedUrl ? (
          <div className="rounded-xl border p-6">
            <div className="text-sm font-semibold">No page loaded</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Paste a URL above and hit <span className="font-medium">Go</span>.
            </div>
          </div>
        ) : readable.isLoading ? (
          <div className="rounded-xl border p-6">
            <div className="text-sm font-semibold">Loading…</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Fetching readable content for{" "}
              <span className="font-mono">{loadedUrl}</span>
            </div>
          </div>
        ) : readable.isError ? (
          <div className="rounded-xl border p-6">
            <div className="text-sm font-semibold">Couldn’t load page</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {(readable.error as any)?.message ?? "Unknown error"}
            </div>
            <div className="mt-4 text-xs text-muted-foreground">
              Try a different URL, or a site that serves normal HTML without
              blocking bots.
            </div>
          </div>
        ) : !readable.isSuccess || !readable.data ? (
          <div className="rounded-xl border p-6">
            <div className="text-sm font-semibold">No content</div>
            <div className="mt-1 text-sm text-muted-foreground">
              The fetch succeeded but returned no readable content.
            </div>
          </div>
        ) : (
          <div className="rounded-xl border p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold">
                  {readable.data.title}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {readable.data.host} ·{" "}
                  <span className="font-mono">{readable.data.url}</span>
                </div>
              </div>
            </div>
            {popoverOpen && anchor && (
              <div
                style={getPopoverStyle(anchor)}
                role="dialog"
                aria-label="WebCut capture"
              >
                <div className="rounded-lg border bg-background shadow-md">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      className={cn(
                        "rounded-md border text-xs font-medium hover:bg-muted disabled:opacity-50",
                        isMobile ? "px-3 py-2 min-h-[44px]" : "px-2 py-1",
                      )}
                      onClick={() => {
                        if (!readable.data) return;

                        createSnippet.mutate({
                          content: selectedText,
                          tags: [],
                          // Optional metadata — keep these only if your server/schema accepts them:
                          sourceUrl: readable.data.url,
                          sourceTitle: readable.data.title,
                          sourceHost: readable.data.host,
                        } as any);
                      }}
                      disabled={!selectedText || createSnippet.isPending}
                    >
                      {createSnippet.isPending ? "Adding…" : "Add snippet"}
                    </button>

                    <div className="text-[11px] text-muted-foreground">
                      {readable.data.host} · {selectedText.length} chars
                    </div>

                    <div className="flex-1" />

                    <button
                      className={cn(
                        "text-xs text-muted-foreground hover:text-foreground",
                        isMobile
                          ? "px-3 py-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          : "px-2 py-1",
                      )}
                      onClick={closePopover}
                      aria-label="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* This container is what Step 3 will attach selection listeners to */}
            <div
              id="webcut-reader"
              className="prose prose-sm mt-6 max-w-none"
              onMouseUp={(e) => {
                // only left mouse
                if (e.button !== 0) return;

                const readerEl = e.currentTarget as HTMLElement;
                const res = getSelectionTextAndAnchor(readerEl);

                if (!res) {
                  closePopover();
                  return;
                }

                setSelectedText(res.text);
                setAnchor({ x: res.x, y: res.y });
                setPopoverOpen(true);
              }}
              dangerouslySetInnerHTML={{ __html: readable.data.contentHtml }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
