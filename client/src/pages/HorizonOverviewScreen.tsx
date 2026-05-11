import React from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, LayoutGrid, FileText } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function ScenarioCardSkeleton() {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-2 h-5 w-2/3" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
    </div>
  );
}

function WarmthBadge({ delta }: { delta: number }) {
  if (delta > 0) return <span className="font-semibold text-emerald-600">▲</span>;
  if (delta < 0) return <span className="font-semibold text-rose-500">▼</span>;
  return <span className="text-muted-foreground">—</span>;
}

function ScenarioCard({
  scenario,
  delta,
}: {
  scenario: {
    id: string;
    themeId: string;
    themeName: string;
    name: string;
    description: string;
  };
  delta?: number;
}) {
  return (
    <a
      href={`/horizon/scenarios/${scenario.id}`}
      className="group rounded-lg border bg-background p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
          {scenario.themeName}
        </span>
        {delta !== undefined && <WarmthBadge delta={delta} />}
      </div>
      <div className="truncate text-sm font-semibold">{scenario.name}</div>
      {scenario.description && (
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
          {scenario.description}
        </p>
      )}
      <div className="mt-4 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
        View scenario →
      </div>
    </a>
  );
}

function EmptyNoThemes() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
      <LayoutGrid className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <div className="text-base font-medium">No themes yet</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Create your first theme to start tracking scenarios.
      </p>
      <Link
        href="/themes"
        className="mt-4 inline-flex items-center rounded-md border bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm hover:opacity-90"
      >
        Create a theme
      </Link>
    </div>
  );
}

function EmptyNoScenarios() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
      <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
      <div className="text-base font-medium">No scenarios yet</div>
      <p className="mt-1 text-sm text-muted-foreground">
        Add scenarios to your themes to begin tracking outcomes.
      </p>
      <Link
        href="/horizon/scenarios"
        className="mt-4 inline-flex items-center rounded-md border bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm hover:opacity-90"
      >
        Add a scenario
      </Link>
    </div>
  );
}

export default function HorizonOverviewScreen() {
  const overviewQ = trpc.horizon.dashboard.getOverview.useQuery(undefined);
  const warmthQ = trpc.horizon.dashboard.getScenarioWarmth.useQuery();

  const themes = overviewQ.data?.themes ?? [];
  const scenarios = overviewQ.data?.scenarios ?? [];

  const warmthMap = new Map(
    (warmthQ.data ?? []).map((w) => [w.scenarioId, w.delta])
  );

  const warmthSorted = [...(warmthQ.data ?? [])].sort((a, b) => b.delta - a.delta);
  const top3Warmest = warmthSorted.filter((w) => w.delta > 0).slice(0, 3);
  const top3Coldest = [...warmthSorted].reverse().filter((w) => w.delta < 0).slice(0, 3);
  const hasRecentlyMoved = top3Warmest.length > 0 || top3Coldest.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="text-3xl font-semibold">Horizon Overview</div>
        <a
          href="/horizon/reports"
          className="inline-flex items-center rounded-md border bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm hover:opacity-90"
        >
          Generate Sentinel Brief
        </a>
      </div>

      {/* Scenario Board */}
      <section>
        <div className="mb-3 text-xl font-medium">Scenario Board</div>

        {overviewQ.isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <ScenarioCardSkeleton />
            <ScenarioCardSkeleton />
            <ScenarioCardSkeleton />
            <ScenarioCardSkeleton />
          </div>
        ) : overviewQ.isError ? (
          <div className="rounded-lg border bg-background p-6 shadow-sm">
            <div className="text-sm font-medium">Unable to load scenarios</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {overviewQ.error.message}
            </div>
            <button
              onClick={() => overviewQ.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Loader2 className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : themes.length === 0 ? (
          <EmptyNoThemes />
        ) : scenarios.length === 0 ? (
          <EmptyNoScenarios />
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {scenarios.map((s) => (
              <ScenarioCard key={s.id} scenario={s} delta={warmthMap.get(s.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Recently moved */}
      {hasRecentlyMoved && (
        <section className="mt-10">
          <div className="mb-3 text-xl font-medium">Recently moved</div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {top3Warmest.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold text-emerald-600">▲ Warming</div>
                <div className="divide-y rounded-md border">
                  {top3Warmest.map((w) => (
                    <a
                      key={w.scenarioId}
                      href={`/horizon/scenarios/${w.scenarioId}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/20 transition"
                    >
                      <span className="font-medium truncate">{w.scenarioName}</span>
                      <span className="ml-4 shrink-0 font-semibold text-emerald-600 tabular-nums">
                        +{w.delta.toFixed(1)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            {top3Coldest.length > 0 && (
              <div>
                <div className="mb-2 text-sm font-semibold text-rose-500">▼ Cooling</div>
                <div className="divide-y rounded-md border">
                  {top3Coldest.map((w) => (
                    <a
                      key={w.scenarioId}
                      href={`/horizon/scenarios/${w.scenarioId}`}
                      className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted/20 transition"
                    >
                      <span className="font-medium truncate">{w.scenarioName}</span>
                      <span className="ml-4 shrink-0 font-semibold text-rose-500 tabular-nums">
                        {w.delta.toFixed(1)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
