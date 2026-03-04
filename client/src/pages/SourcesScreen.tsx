// client/src/pages/SourcesScreen.tsx
import {  useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Trash2, Pencil } from "lucide-react";

export default function SourcesScreen() {
  const [q, setQ] = useState("");
  const listQuery = trpc.sources.list.useQuery({ q, limit: 100 });

  const create = trpc.sources.create.useMutation({
    onSuccess: () => listQuery.refetch(),
  });
  const update = trpc.sources.update.useMutation({
    onSuccess: () => listQuery.refetch(),
  });
  const del = trpc.sources.delete.useMutation({
    onSuccess: () => listQuery.refetch(),
  });

  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold">Sources</h1>
          <p className="text-sm text-muted-foreground">
            Manage canonical URLs used for polling and capture.
          </p>
        </div>

        <button
          className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent"
          onClick={() => {
            const url = prompt("Source URL?");
            if (!url) return;
            create.mutate({ url });
          }}
        >
          <Plus className="h-4 w-4" />
          Add source
        </button>
      </header>

      <section className="rounded-lg border bg-background p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <input
            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            placeholder="Search by URL or title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {listQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-background shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">URL</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listQuery.isLoading ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={4}>
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-muted-foreground" colSpan={4}>
                    No sources yet. Add one to start building your polling pipeline.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">{r.title ?? "—"}</td>
                    <td className="px-4 py-3 font-mono">
                      <a className="underline underline-offset-2" href={r.url} target="_blank" rel="noreferrer">
                        {r.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border hover:bg-accent"
                          onClick={() => {
                            const title = prompt("Title (blank to clear):", r.title ?? "");
                            if (title === null) return;
                            update.mutate({ id: r.id, title: title.trim() === "" ? null : title.trim() });
                          }}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="inline-flex h-10 w-10 items-center justify-center rounded-md border hover:bg-accent"
                          onClick={() => {
                            if (!confirm("Delete this source?")) return;
                            del.mutate({ id: r.id });
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}