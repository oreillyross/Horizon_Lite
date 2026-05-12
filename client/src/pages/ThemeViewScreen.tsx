import { trpc } from "@/lib/trpc";
import { Link, useRoute, useLocation } from "wouter";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RefreshSynopsisButton } from "@/components/RefreshSynopsisButton";

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

export default function ThemeViewScreen() {
  const [, params] = useRoute("/theme/:id");
  const [, setLocation] = useLocation();
  const id = params?.id ?? "";

  const themeQuery = trpc.themes.getThemeById.useQuery({ id }, { enabled: !!id });
  const scenariosQuery = trpc.horizon.scenarios.list.useQuery(
    { themeId: id },
    { enabled: !!id },
  );

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

  const scenarios = scenariosQuery.data ?? [];

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

        <div className="flex items-center gap-3">
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setLocation(`/horizon/scenarios/new?themeId=${id}`)}
          >
            <Plus className="h-4 w-4" />
            Capture Scenario
          </Button>
          <RefreshSynopsisButton themeId={theme.id} />
          <div className="text-right text-sm text-muted-foreground">
            <div>Synopsis updated: {fmtDate(theme.synopsisUpdatedAt)}</div>
            <div>Version: {theme.synopsisVersion ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 rounded-md border p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-medium">Synopsis</h2>
            <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
              AI suggestion — analyst reviews
            </span>
            {theme.synopsisModel && (
              <span className="text-xs text-muted-foreground font-mono">
                {theme.synopsisModel}
              </span>
            )}
          </div>
          <div className="mt-3 text-sm whitespace-pre-wrap">
            {theme.synopsis?.trim()
              ? JSON.parse(theme.synopsis ?? "{}").synopsis
              : "No synopsis yet."}
          </div>
        </div>

        <div className="rounded-md border p-4">
          <h2 className="text-xl font-medium">Scenarios</h2>
          <div className="mt-2 text-sm text-muted-foreground">
            {scenarios.length} in this theme
          </div>

          <div className="mt-4 space-y-3">
            {scenariosQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading…
              </div>
            ) : scenarios.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No scenarios yet. Use "Capture Scenario" to add one.
              </div>
            ) : (
              scenarios.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/horizon/scenarios/${s.id}`}
                    className="text-sm underline truncate"
                  >
                    {s.name}
                  </Link>
                  <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                    {s.indicatorCount} indicator{s.indicatorCount !== 1 ? "s" : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
