import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

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
  const [urlInput, setUrlInput] = useState("");
  const [loadedUrl, setLoadedUrl] = useState<string>("");

  const normalized = useMemo(() => normalizeUrl(urlInput), [urlInput]);
  const host = useMemo(() => hostFromUrl(loadedUrl), [loadedUrl]);

  const readable = trpc.webcutFetchReadable.useQuery(
    { url: loadedUrl },
    { enabled: !!loadedUrl },
  );

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

            {/* This container is what Step 3 will attach selection listeners to */}
            <div
              id="webcut-reader"
              className="prose prose-sm mt-6 max-w-none"
              dangerouslySetInnerHTML={{ __html: readable.data.contentHtml }}
            />
          </div>
        )}
      </main>
    </div>
  );
}
