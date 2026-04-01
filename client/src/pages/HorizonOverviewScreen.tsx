import React from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

type Confidence = "low" | "medium" | "high";
type Momentum = "calm" | "building" | "accelerating";

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | Confidence;
}) {
  const cls =
    tone === "high"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : tone === "medium"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "low"
      ? "bg-slate-50 text-slate-600 border-slate-200"
      : "bg-muted text-foreground border-border";

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${cls}`}>
      {children}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function ScenarioCardSkeleton() {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-3 h-8 w-1/3" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="mt-4 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-5/6" />
    </div>
  );
}

function ScenarioCard({
  scenario,
}: {
  scenario: {
    id: string;
    name: string;
    probability: number;
    delta7d: number;
    momentum: Momentum;
    confidence: Confidence;
    topDrivers: { indicatorId: string; name: string }[];
  };
}) {
  const pct = Math.round(scenario.probability * 100);
  const deltaPct = Math.round(scenario.delta7d * 100);
  const deltaSign = deltaPct > 0 ? "+" : "";

  return (
    <a
      href={`/horizon/scenarios/${scenario.id}`}
      className="group rounded-lg border bg-background p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{scenario.name}</div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">{pct}%</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Pill tone={scenario.confidence}>{scenario.confidence.toUpperCase()}</Pill>
          <Pill>{scenario.momentum}</Pill>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">7d</span>
        <span className="font-medium tabular-nums">
          {deltaSign}{deltaPct}%
        </span>
      </div>

      <div className="mt-4">
        <div className="text-xs text-muted-foreground">Indicators</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {scenario.topDrivers.slice(0, 3).map((d) => (
            <span
              key={d.indicatorId}
              className="rounded-md border bg-muted px-2 py-1 text-xs"
              title={d.name}
            >
              {d.name}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
        View scenario →
      </div>
    </a>
  );
}

export default function HorizonOverviewScreen() {
  const overviewQ = trpc.horizon.dashboard.getOverview.useQuery(undefined);
  const scenarios = overviewQ.data?.scenarios ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div className="text-3xl font-semibold">Hybrid Warfare Early Warning — Europe</div>
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
