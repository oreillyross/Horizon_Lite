import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

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

  const rows = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Recent sources</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest items from your tracked sources. Capture any item into a snippet.
          </p>
        </div>

        <button
          className="h-10 rounded-md border bg-background px-3 text-sm hover:bg-muted disabled:opacity-50"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="rounded-xl border bg-card">
        {itemsQuery.isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : itemsQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            Failed to load: {itemsQuery.error?.message ?? "Unknown error"}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No items yet. Click “Refresh”.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((it) => {
              const captured = Boolean(it.capturedAt);

              return (
                <li key={it.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                          {it.sourceName}
                        </span>
                        {captured && (
                          <span className="rounded-md border px-2 py-0.5 text-xs text-muted-foreground">
                            Captured
                          </span>
                        )}
                      </div>

                      <a
                        href={it.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block truncate text-sm font-medium hover:underline"
                        title={it.title}
                      >
                        {it.title}
                      </a>

                      {it.excerpt ? (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                          {it.excerpt}
                        </p>
                      ) : null}

                      <div className="mt-2 text-xs text-muted-foreground">
                        {it.publishedAt
                          ? `Published: ${new Date(it.publishedAt).toLocaleString()}`
                          : `Fetched: ${new Date(it.fetchedAt).toLocaleString()}`}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {it.capturedSnippetId ? (
                        <Link
                          to={`/snippet/${it.capturedSnippetId}`}
                          className="h-10 rounded-md border bg-background px-3 text-sm hover:bg-muted"
                        >
                          View
                        </Link>
                      ) : null}

                      <button
                        className="h-10 rounded-md bg-primary px-3 text-sm text-primary-foreground hover:opacity-90 disabled:opacity-50"
                        disabled={captured || captureMutation.isPending}
                        onClick={() => captureMutation.mutate({ id: it.id })}
                      >
                        {captured
                          ? "Captured"
                          : captureMutation.isPending
                          ? "Capturing…"
                          : "Capture"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
