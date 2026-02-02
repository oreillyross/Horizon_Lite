import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { ExternalLink, RefreshCw, Plus, Loader2 } from "lucide-react";

type RecentSourceItem = {
  id: string;
  title: string;
  url: string;
  source: string; // e.g. "FT", "BBC", "ICJ", etc.
  publishedAt: string | Date;
  fetchedAt?: string | Date;
  // Optional extras you can add later:
  // excerpt?: string;
  // capturedSnippetId?: string | null;
};

function fmtTime(d: string | Date | undefined) {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? "" : dt.toLocaleString();
}

export default function RecentSourcesScreen() {
  const utils = trpc.useUtils();

  const itemsQuery = trpc.getRecentSourceItems.useQuery(
    { limit: 50 },
    { refetchOnWindowFocus: false }
  );

  const refreshMutation = trpc.refreshSources.useMutation({
    onSuccess: async () => {
      await utils.getRecentSourceItems.invalidate();
    },
  });

  const captureMutation = trpc.captureSourceItem.useMutation({
    onSuccess: async () => {
      await utils.getRecentSourceItems.invalidate();
    },
  });

  const items = (itemsQuery.data ?? []) as RecentSourceItem[];

  const isBusy =
    itemsQuery.isLoading ||
    refreshMutation.isPending ||
    captureMutation.isPending;

  const headerMeta = useMemo(() => {
    const n = items.length;
    const newest = items[0]?.publishedAt;
    return { n, newest };
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Recent sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Focused crawl of your tracked sources. Click capture to turn an item
            into a snippet.
          </p>

          <div className="mt-2 text-xs text-muted-foreground">
            {headerMeta.n} items
            {headerMeta.newest ? ` • newest: ${fmtTime(headerMeta.newest)}` : ""}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent disabled:opacity-60"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Refresh
        </button>
      </div>

      <div className="rounded-xl border bg-card">
        {itemsQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : itemsQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            Failed to load items: {itemsQuery.error?.message ?? "Unknown error"}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No recent source items yet. Hit refresh to crawl your sources.
          </div>
        ) : (
          <ul className="divide-y">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-start justify-between gap-4 p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                      {it.source}
                    </span>

                    <a
                      href={it.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-sm font-medium hover:underline"
                      title={it.title}
                    >
                      {it.title}
                    </a>

                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>Published: {fmtTime(it.publishedAt)}</span>
                    {it.fetchedAt ? <span>Fetched: {fmtTime(it.fetchedAt)}</span> : null}
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent disabled:opacity-60"
                  disabled={captureMutation.isPending || isBusy}
                  onClick={() => captureMutation.mutate({ id: it.id })}
                  aria-label={`Capture "${it.title}"`}
                >
                  {captureMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Capture
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {refreshMutation.isError ? (
        <div className="mt-4 text-sm text-destructive">
          Refresh failed: {refreshMutation.error?.message ?? "Unknown error"}
        </div>
      ) : null}

      {captureMutation.isError ? (
        <div className="mt-2 text-sm text-destructive">
          Capture failed: {captureMutation.error?.message ?? "Unknown error"}
        </div>
      ) : null}
    </div>
  );
}
