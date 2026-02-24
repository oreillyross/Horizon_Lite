import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

type GeoMetric = "volume" | "acceleration" | "emotionShift";

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "low" | "medium" | "high";
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

function ScenarioCardsGrid({
  scenarios,
}: {
  scenarios: Array<{
    id: string;
    name: string;
    probability: number;
    delta7d: number;
    momentum: string;
    confidence: "low" | "medium" | "high";
    topDrivers: { indicatorId: string; name: string }[];
  }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {scenarios.map((s) => {
        const pct = Math.round(s.probability * 100);
        const deltaPct = Math.round(s.delta7d * 100);
        const deltaSign = deltaPct > 0 ? "+" : "";
        return (
          <a
            key={s.id}
            href={`/horizon/scenarios/${s.id}`}
            className="group rounded-lg border bg-background p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{s.name}</div>
                <div className="mt-2 text-3xl font-semibold tabular-nums">
                  {pct}%
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Pill tone={s.confidence}>{s.confidence.toUpperCase()}</Pill>
                <Pill>{s.momentum}</Pill>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">7d</span>
              <span className="font-medium tabular-nums">
                {deltaSign}
                {deltaPct}%
              </span>
            </div>

            <div className="mt-4">
              <div className="text-xs text-muted-foreground">Top drivers</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {s.topDrivers.slice(0, 3).map((d) => (
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
      })}
    </div>
  );
}

function WeakSignalList({
  items,
}: {
  items: Array<{
    id: string;
    name: string;
    category: string;
    status: string;
    accelerationScore: number;
    lastTriggeredAt: string | null;
  }>;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Weak Signal Radar</div>
        <a href="/horizon/signals" className="text-sm text-muted-foreground hover:underline">
          View all
        </a>
      </div>

      <div className="mt-4 space-y-3">
        {items.map((it) => (
          <a
            key={it.id}
            href={`/horizon/signals/${it.id}`}
            className="flex items-center justify-between gap-4 rounded-md px-2 py-2 hover:bg-muted"
          >
            <div className="min-w-0">
              <div className="truncate text-sm">{it.name}</div>
              <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                <span>{it.category}</span>
                <span>•</span>
                <span>{it.status}</span>
                {it.lastTriggeredAt ? (
                  <>
                    <span>•</span>
                    <span className="truncate">triggered</span>
                  </>
                ) : null}
              </div>
            </div>
            <div className="shrink-0 text-sm font-medium tabular-nums">
              {it.accelerationScore.toFixed(1)}
            </div>
          </a>
        ))}
        {items.length === 0 ? (
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            No signals detected. Consider tuning thresholds.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExplainabilityStack({
  items,
}: {
  items: Array<{
    indicatorId: string;
    indicatorName: string;
    rationale: string;
    confidence: "low" | "medium" | "high";
    evidenceIds: string[];
  }>;
}) {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="text-sm font-medium">Why did this change?</div>
      <div className="mt-4 space-y-3">
        {items.map((x) => (
          <div key={x.indicatorId} className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{x.indicatorName}</div>
                <div className="mt-1 text-sm text-muted-foreground">{x.rationale}</div>
              </div>
              <Pill tone={x.confidence}>{x.confidence.toUpperCase()}</Pill>
            </div>
            <div className="mt-3">
              <a
                href={`/horizon/signals/${x.indicatorId}`}
                className="text-sm text-muted-foreground hover:underline"
              >
                View indicator →
              </a>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
            No significant shifts detected.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function HorizonOverviewScreen() {
  const [geoMetric, setGeoMetric] = useState<GeoMetric>("acceleration");

  const overviewQ = trpc.horizon.dashboard.getOverview.useQuery({
    geoMetric,
  });

  const data = overviewQ.data;

  const confidenceTone = useMemo(() => {
    if (!data) return "default";
    return data.overallConfidence;
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8">
      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div>
          <div className="text-3xl font-semibold">Hybrid Warfare Early Warning — Europe</div>
          {data ? (
            <div className="mt-2 text-sm text-muted-foreground">{data.heroLine}</div>
          ) : (
            <Skeleton className="mt-3 h-4 w-[420px]" />
          )}
        </div>

        <div className="flex items-center gap-3">
          {data ? (
            <div className="text-sm text-muted-foreground">
              Last update: <span className="font-medium tabular-nums">{new Date(data.lastUpdateAt).toLocaleString()}</span>
            </div>
          ) : (
            <Skeleton className="h-4 w-48" />
          )}
          <Pill tone={confidenceTone as any}>
            {data ? data.overallConfidence.toUpperCase() : "—"}
          </Pill>
          <a
            href="/horizon/reports"
            className="inline-flex items-center rounded-md border bg-foreground px-4 py-2 text-sm font-medium text-background shadow-sm hover:opacity-90"
          >
            Generate Sentinel Brief
          </a>
        </div>
      </div>

      {/* Scenario Board */}
      <section className="pb-6">
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
            <div className="text-sm font-medium">Unable to load dashboard</div>
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
        ) : data ? (
          <ScenarioCardsGrid
            scenarios={data.scenarios.map((s) => ({
              ...s,
              topDrivers: s.topDrivers.map((d) => ({ indicatorId: d.indicatorId, name: d.name })),
            }))}
          />
        ) : null}
      </section>

      {/* Mid row */}
      <section className="grid grid-cols-1 gap-6 pb-6 lg:grid-cols-3">
        {/* Pressure timeline placeholder */}
        <div className="rounded-lg border bg-background p-4 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium">Momentum Timeline</div>
            <div className="text-sm text-muted-foreground">
              (Chart in V1.1 — data already available)
            </div>
          </div>
          {data ? (
            <div className="mt-4 rounded-md border bg-muted p-4 text-sm text-muted-foreground">
              {data.pressureSeries.length} points loaded. Render a simple line chart next.
            </div>
          ) : (
            <Skeleton className="mt-4 h-40 w-full" />
          )}
        </div>

        <WeakSignalList items={data?.weakSignals ?? []} />
      </section>

      {/* Geo + Explainability */}
      <section className="grid grid-cols-1 gap-6 pb-10 lg:grid-cols-3">
        <div className="rounded-lg border bg-background p-4 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-medium">Geographic Pulse</div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Metric</label>
              <select
                className="h-10 rounded-md border bg-background px-3 text-sm"
                value={geoMetric}
                onChange={(e) => setGeoMetric(e.target.value as GeoMetric)}
              >
                <option value="volume">Volume</option>
                <option value="acceleration">Acceleration</option>
                <option value="emotionShift">Emotion shift</option>
              </select>
            </div>
          </div>

          {data ? (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                Map placeholder (V1). We’ll render a Europe map in V1.1.
              </div>
              <div className="rounded-md border p-4">
                <div className="text-xs text-muted-foreground">Hotspots</div>
                <div className="mt-3 space-y-2">
                  {data.hotspots.map((h) => (
                    <div key={h.geoKey} className="flex items-center justify-between text-sm">
                      <span>{h.label}</span>
                      <span className="font-medium tabular-nums">{h.value.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <Skeleton className="mt-4 h-40 w-full" />
          )}
        </div>

        <ExplainabilityStack items={data?.explainability ?? []} />
      </section>
    </div>
  );
}