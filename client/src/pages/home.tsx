import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type RecentRow = {
  id: string;
  createdAt: Date;
  content: string;
  tags: string[];
};

function MetaBar({
  snippetCount,
  tagCount,
  lastUpdatedAt,
  isLoading,
}: {
  snippetCount: number;
  tagCount: number;
  lastUpdatedAt: Date | null;
  isLoading: boolean;
}) {
  return (
    <section className="rounded-lg border bg-background px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Snippets</span>
          <span className="font-semibold tabular-nums">
            {isLoading ? "—" : snippetCount}
          </span>
        </div>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Tags</span>
          <span className="font-semibold tabular-nums">
            {isLoading ? "—" : tagCount}
          </span>
        </div>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <div className="flex items-baseline gap-2">
          <span className="text-muted-foreground">Last updated</span>
          <span className="font-semibold tabular-nums">
            {isLoading
              ? "—"
              : lastUpdatedAt
              ? formatDistanceToNow(lastUpdatedAt, { addSuffix: true })
              : "—"}
          </span>
        </div>

        <div className="ml-auto text-xs text-muted-foreground">
          {isLoading
            ? "Loading…"
            : lastUpdatedAt
            ? lastUpdatedAt.toLocaleString()
            : "No activity yet"}
        </div>
      </div>
    </section>
  );
}


function StatCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {subtext ? (
        <div className="mt-1 text-sm text-muted-foreground">{subtext}</div>
      ) : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-background p-6 shadow-sm">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-8 w-16 animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-32 animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function Home() {
  const snippetsQuery = trpc.getSnippets.useQuery();
  const tagsQuery = trpc.getTags.useQuery();

  const snippets = (snippetsQuery.data ?? []) as RecentRow[];

  const snippetCount = snippets.length;
  const tagCount = tagsQuery.data?.length ?? 0;

  const lastUpdatedAt = useMemo(() => {
    if (!snippets.length) return null;
    // If/when you add updatedAt later, prefer that. For now: createdAt.
    const newest = [...snippets].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return newest?.createdAt ? new Date(newest.createdAt) : null;
  }, [snippets]);

  const recent = useMemo(() => {
    return [...snippets]
      .sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);
  }, [snippets]);

  const isLoading = snippetsQuery.isLoading || tagsQuery.isLoading;
  const isError = snippetsQuery.isError || tagsQuery.isError;

  return (
    <main className="mx-auto max-w-7xl px-6 lg:px-8 py-6 space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div>

          <p className="mt-1 text-sm text-muted-foreground">
            Quick overview and recent activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/snippet/create">
            <a className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
              New Snippet
            </a>
          </Link>
          <Link href="/snippet/show">
            <a className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">
              Browse
            </a>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <MetaBar
        snippetCount={snippetCount}
        tagCount={tagCount}
        lastUpdatedAt={lastUpdatedAt}
        isLoading={isLoading}
      />



      {/* Recent snippets */}
      <section className="rounded-lg border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-medium">Recent snippets</h2>
          <Link href="/snippet/show">
            <a className="text-sm font-medium text-muted-foreground hover:underline">
              View all
            </a>
          </Link>
        </div>

        {isError ? (
          <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm">
            Something went wrong loading the dashboard.
          </div>
        ) : isLoading ? (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="mt-4 rounded-md border p-6 text-sm">
            <div className="font-medium">No snippets yet</div>
            <div className="mt-1 text-muted-foreground">
              Create your first snippet to see activity here.
            </div>
            <div className="mt-4">
              <Link href="/snippet/create">
                <a className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                  Create your first snippet
                </a>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Snippet</th>
                  <th className="py-2 pr-4 font-medium">Tags</th>
                  <th className="py-2 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => {
                  const preview =
                    (s.content ?? "").trim().slice(0, 120) +
                    ((s.content ?? "").trim().length > 120 ? "…" : "");

                  return (
                    <tr key={s.id} className="border-t">
                      <td className="py-3 pr-4">
                        <Link href={`/snippet/${s.id}/edit`}>
                          <a className="font-medium hover:underline">
                            {preview || "(empty snippet)"}
                          </a>
                        </Link>
                      </td>

                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap gap-1">
                          {(s.tags ?? []).slice(0, 4).map((t) => (
                            <Link key={t} href={`/?tag=${encodeURIComponent(t)}`}>
                              <a className="rounded-md border px-2 py-0.5 text-xs hover:bg-muted">
                                {t}
                              </a>
                            </Link>
                          ))}
                          {(s.tags ?? []).length > 4 ? (
                            <span className="text-xs text-muted-foreground">
                              +{(s.tags ?? []).length - 4}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 text-muted-foreground">
                        {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
