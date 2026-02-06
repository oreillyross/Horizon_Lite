import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

export default function ThemesScreen() {
  const { data, isLoading, isError, error } = trpc.themes.getThemes.useQuery();

  if (isLoading) {
    return (
      <div className="px-6 lg:px-8 py-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading themes…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-6 lg:px-8 py-6 text-sm text-red-600">
        Failed to load themes: {error?.message}
      </div>
    );
  }

  const themes = data ?? [];

  return (
    <div className="px-6 lg:px-8 py-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Themes</h1>
        <Link href="/theme/create" className="text-sm underline">
          {/* (Optional later) Create Theme screen */}
          Create
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Snippets</th>
              <th className="px-4 py-3 font-medium">Synopsis updated</th>
              <th className="px-4 py-3 font-medium">Version</th>
            </tr>
          </thead>
          <tbody>
            {themes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                  No themes yet.
                </td>
              </tr>
            ) : (
              themes.map((t) => (
                <tr key={t.id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <Link href={`/theme/${t.id}`} className="font-medium underline">
                      {t.name}
                    </Link>
                    {t.description ? (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {t.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{t.snippetCount}</td>
                  <td className="px-4 py-3">{fmtDate(t.synopsisUpdatedAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{t.synopsisVersion ?? 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
