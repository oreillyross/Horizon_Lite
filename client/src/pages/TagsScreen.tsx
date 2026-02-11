import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc"; // adjust if your path differs
import { Link } from "wouter";

type SortKey = "count" | "alpha";

export default function TagsScreen() {
  const { data, isLoading, isError, error } = trpc.snippets.getTags.useQuery();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("count");

  const rows = useMemo(() => {
    const list = data ?? [];
    const query = q.trim().toLowerCase();

    const filtered = query.length
      ? list.filter((t) => t.tag.toLowerCase().includes(query))
      : list;

    const sorted = [...filtered].sort((a, b) => {
      if (sort === "alpha") return a.tag.localeCompare(b.tag);
      // sort === "count"
      return b.count - a.count || a.tag.localeCompare(b.tag);
    });

    return sorted;
  }, [data, q, sort]);

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Tags</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tag usage across your snippets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="h-10 rounded-md border bg-background px-3 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort tags"
          >
            <option value="count">Sort: Most used</option>
            <option value="alpha">Sort: A → Z</option>
          </select>

          <input
            className="h-10 w-56 rounded-md border bg-background px-3 text-sm"
            placeholder="Search tags…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : isError ? (
          <div className="p-6 text-sm text-destructive">
            Failed to load tags: {error?.message ?? "Unknown error"}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">
            No tags found.
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((t) => (
              <li key={t.tag} className="flex items-center justify-between p-4">
                <Link
                  to={`/snippet/show?tag=${encodeURIComponent(t.slug)}`}
                  className="font-mono text-sm text-primary hover:underline"
                >
                  #{t.tag}
                </Link>
                <div className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                  {t.count} snippet{t.count === 1 ? "" : "s"}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
