import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

type IndicatorStatus = "normal" | "watching" | "triggered";
type IndicatorCategory = "infoops" | "political" | "infra" | "diplomatic";

function Pill({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "normal" | "watching" | "triggered";
}) {
  const cls =
    tone === "triggered"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : tone === "watching"
      ? "bg-slate-50 text-slate-700 border-slate-200"
      : tone === "normal"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
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

function TableSkeleton() {
  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <Skeleton className="h-4 w-40" />
      <div className="mt-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function HorizonSignalsScreen() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<IndicatorStatus | "">("");
  const [category, setCategory] = useState<IndicatorCategory | "">("");

  const queryInput = useMemo(() => {
    return {
      q: q.trim() ? q.trim() : undefined,
      status: status || undefined,
      category: category || undefined,
      // themeId: optional later
    };
  }, [q, status, category]);

  const listQ = trpc.horizon.signals.listIndicators.useQuery(queryInput);

  const rows = listQ.data ?? [];

  const total = rows.length;
  const triggeredCount = rows.filter((r) => r.status === "triggered").length;
  const watchingCount = rows.filter((r) => r.status === "watching").length;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/horizon/overview" className="hover:underline">
              Horizon
            </Link>
            <span className="mx-2">/</span>
            <span>Signals</span>
          </div>
          <div className="mt-2 text-3xl font-semibold">Signals</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Operator view. Track indicator acceleration and drill into evidence.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-semibold tabular-nums">{total}</div>
          </div>
          <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
            <div className="text-xs text-muted-foreground">Triggered</div>
            <div className="text-xl font-semibold tabular-nums">{triggeredCount}</div>
          </div>
          <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
            <div className="text-xs text-muted-foreground">Watching</div>
            <div className="text-xl font-semibold tabular-nums">{watchingCount}</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 rounded-lg border bg-background p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="text-sm text-muted-foreground">Search</label>
            <input
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              placeholder="e.g., amplification, undersea, rhetoric…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-sm text-muted-foreground">Category</label>
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
            >
              <option value="">All</option>
              <option value="infoops">InfoOps</option>
              <option value="political">Political</option>
              <option value="infra">Infrastructure</option>
              <option value="diplomatic">Diplomatic</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm text-muted-foreground">Status</label>
            <select
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="">All</option>
              <option value="triggered">Triggered</option>
              <option value="watching">Watching</option>
              <option value="normal">Normal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6">
        {listQ.isLoading ? (
          <TableSkeleton />
        ) : listQ.isError ? (
          <div className="rounded-lg border bg-background p-6 shadow-sm">
            <div className="text-sm font-medium">Unable to load signals</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {listQ.error.message}
            </div>
            <button
              onClick={() => listQ.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Loader2 className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border bg-background p-6 shadow-sm">
            <div className="text-sm font-medium">No indicators found</div>
            <div className="mt-2 text-sm text-muted-foreground">
              Try clearing filters, or add indicators in the backend seed data.
            </div>
            <button
              onClick={() => {
                setQ("");
                setCategory("");
                setStatus("");
              }}
              className="mt-4 inline-flex items-center rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-background shadow-sm">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 px-4">Indicator</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Acceleration</th>
                  <th className="py-3 px-4">Current / Baseline</th>
                  <th className="py-3 px-4">Last Triggered</th>
                  <th className="py-3 px-4">Mapped Scenarios</th>
                </tr>
              </thead>
              <tbody>
                {rows
                  .slice()
                  .sort((a, b) => b.accelerationScore - a.accelerationScore)
                  .map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0 hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <a
                          href={`/horizon/signals/${r.id}`}
                          className="font-medium hover:underline"
                        >
                          {r.name}
                        </a>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{r.category}</td>
                      <td className="py-3 px-4">
                        <Pill tone={r.status as any}>{r.status}</Pill>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {r.accelerationScore.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums">
                        {r.currentValue.toFixed(1)} / {r.baselineValue.toFixed(1)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground tabular-nums">
                        {r.lastTriggeredAt ? new Date(r.lastTriggeredAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          {r.mappedScenarios?.slice(0, 3).map((ms) => (
                            <a
                              key={ms.scenarioId}
                              href={`/horizon/scenarios/${ms.scenarioId}`}
                              className="rounded-md border bg-muted px-2 py-1 text-xs hover:underline"
                              title={`weight: ${ms.weight}`}
                            >
                              {ms.scenarioId}
                            </a>
                          ))}
                          {r.mappedScenarios?.length > 3 ? (
                            <span className="text-xs text-muted-foreground">
                              +{r.mappedScenarios.length - 3}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}