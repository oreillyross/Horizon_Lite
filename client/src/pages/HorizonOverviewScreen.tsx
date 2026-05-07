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

function ScenarioCard({
  scenario,
}: {
  scenario: {
    id: string;
    themeId: string;
    themeName: string;
    name: string;
    description: string;
  };
}) {
  return (
    <a
      href={`/horizon/scenarios/${scenario.id}`}
      className="group rounded-lg border bg-background p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {scenario.themeName}
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

  const themes = overviewQ.data?.themes ?? [];
  const scenarios = overviewQ.data?.scenarios ?? [];

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
              <ScenarioCard key={s.id} scenario={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
