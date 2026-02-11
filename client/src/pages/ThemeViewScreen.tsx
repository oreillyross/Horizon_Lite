import { trpc } from "@/lib/trpc";
import { Link, useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import { RefreshSynopsisButton } from "@/components/RefreshSynopsisButton";

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

export default function ThemeViewScreen() {
  const [, params] = useRoute("/theme/:id");
  const id = params?.id ?? "";

  const themeQuery = trpc.themes.getThemeById.useQuery({ id }, { enabled: !!id });
  const snippetsQuery = trpc.snippets.getSnippets.useQuery(); // we’ll filter client-side for now

  // (Optional now, useful later) stub refresh button can call a future mutation
  // const refresh = trpc.themes.refreshThemeSynopsis.useMutation();

  if (themeQuery.isLoading) {
    return (
      <div className="px-6 lg:px-8 py-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading theme…
      </div>
    );
  }

  if (themeQuery.isError) {
    return (
      <div className="px-6 lg:px-8 py-6 text-sm text-red-600">
        Failed to load theme: {themeQuery.error.message}
      </div>
    );
  }

  const theme = themeQuery.data;
  if (!theme) {
    return (
      <div className="px-6 lg:px-8 py-6 text-sm">
        Theme not found. <Link href="/themes" className="underline">Back</Link>
      </div>
    );
  }

  const allSnippets = snippetsQuery.data ?? [];
  const themeSnippets = allSnippets.filter((s: any) => s.themeId === theme.id);

  return (
    <div className="px-6 lg:px-8 py-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/themes" className="underline">Themes</Link> / {theme.name}
          </div>
          <h1 className="text-3xl font-semibold mt-1">{theme.name}</h1>
          {theme.description ? (
            <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
              {theme.description}
            </p>
      
          ) : null}
        </div>
        <RefreshSynopsisButton themeId={theme.id}/>

        <div className="text-right text-sm text-muted-foreground">
          <div>Synopsis updated: {fmtDate(theme.synopsisUpdatedAt)}</div>
          <div>Version: {theme.synopsisVersion ?? 0}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-medium">Synopsis</h2>
           
          </div>

          <div className="mt-3 text-sm whitespace-pre-wrap">
            {theme.synopsis?.trim()
              ? JSON.parse(theme.synopsis ?? "{}").synopsis 
              : "No synopsis yet. "}
          </div>
        </div>

        <div className="rounded-md border p-4">
          <h2 className="text-xl font-medium">Snippets</h2>
          <div className="mt-2 text-sm text-muted-foreground">
            {themeSnippets.length} in this theme
          </div>

          <div className="mt-4 space-y-3">
            {themeSnippets.length === 0 ? (
              <div className="text-sm text-muted-foreground">No snippets assigned yet.</div>
            ) : (
              themeSnippets
                .slice()
                .sort((a: any, b: any) => +new Date(b.createdAt) - +new Date(a.createdAt))
                .slice(0, 25)
                .map((s: any) => (
                  <div key={s.id} className="text-sm">
                    <Link href={`/snippet/${s.id}`} className="underline">
                      {String(s.content ?? "").slice(0, 70) || "(empty)"}…
                    </Link>
                    <div className="text-xs text-muted-foreground mt-1">
                      {Array.isArray(s.tags) ? s.tags.join(", ") : ""}
                    </div>
                  </div>
                ))
            )}
          </div>

          {themeSnippets.length > 25 ? (
            <div className="mt-4 text-xs text-muted-foreground">
              Showing latest 25. (We can add pagination/filtering next.)
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
