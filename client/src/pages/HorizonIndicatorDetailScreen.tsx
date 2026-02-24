import React from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

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
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${cls}`}
    >
      {children}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
  );
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}</div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border bg-muted p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

export default function HorizonIndicatorDetailScreen() {
  const params = useParams<{ id: string }>();
  const indicatorId = params?.id ?? "";

  const q = trpc.horizon.signals.getIndicator.useQuery(
    { indicatorId },
    { enabled: Boolean(indicatorId) },
  );

  const d = q.data;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            <Link href="/horizon/overview" className="hover:underline">
              Horizon
            </Link>
            <span className="mx-2">/</span>
            <Link href="/horizon/signals" className="hover:underline">
              Signals
            </Link>
          </div>

          {q.isLoading ? (
            <>
              <Skeleton className="mt-3 h-8 w-[520px]" />
              <Skeleton className="mt-3 h-4 w-[420px]" />
            </>
          ) : d ? (
            <>
              <div className="mt-2 text-3xl font-semibold truncate">
                {d.indicator.name}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Category:{" "}
                <span className="font-medium text-foreground">
                  {d.indicator.category}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {q.isLoading ? (
            <>
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-40" />
            </>
          ) : d ? (
            <>
              <Pill tone={d.indicator.status as any}>{d.indicator.status}</Pill>

              <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
                <div className="text-xs text-muted-foreground">
                  Acceleration
                </div>
                <div className="text-xl font-semibold font-mono tabular-nums">
                  {d.indicator.accelerationScore.toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
                <div className="text-xs text-muted-foreground">
                  Current / Baseline
                </div>
                <div className="text-xl font-semibold font-mono tabular-nums">
                  {d.indicator.currentValue.toFixed(1)} /{" "}
                  {d.indicator.baselineValue.toFixed(1)}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {q.isError ? (
        <div className="mt-6 rounded-lg border bg-background p-6 shadow-sm">
          <div className="text-sm font-medium">Unable to load indicator</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {q.error.message}
          </div>
          <button
            onClick={() => q.refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Loader2 className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Trend"
            right={
              <span className="text-sm text-muted-foreground">
                (Chart in V1.1)
              </span>
            }
          >
            {q.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : d?.trend?.length ? (
              <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                {d.trend.length} points loaded. Render a line chart next.
              </div>
            ) : (
              <EmptyBox
                title="No trend data"
                body="Once ingestion runs, trend points will appear here."
              />
            )}
          </SectionCard>
        </div>

        {/* Scenario impact */}
        <SectionCard title="Scenario impact">
          {q.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : d?.scenarioImpact?.length ? (
            <div className="space-y-2">
              {d.scenarioImpact
                .slice()
                .sort((a, b) => b.weight - a.weight)
                .map((s) => (
                  <a
                    key={s.scenarioId}
                    href={`/horizon/scenarios/${s.scenarioId}`}
                    className="block rounded-md border px-3 py-2 hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {s.scenarioName}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          weight:{" "}
                          <span className="font-mono tabular-nums">
                            {s.weight.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">→</div>
                    </div>
                  </a>
                ))}
            </div>
          ) : (
            <EmptyBox
              title="No scenario mappings"
              body="Map this indicator to scenarios to show strategic impact."
            />
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trigger history */}
        <SectionCard title="Trigger history">
          {q.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : d?.triggerHistory?.length ? (
            <div className="space-y-2">
              {d.triggerHistory
                .slice()
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="text-muted-foreground tabular-nums">
                      {new Date(t.at).toLocaleString()}
                    </div>
                    <div className="font-mono tabular-nums">
                      {t.value.toFixed(2)}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyBox
              title="No triggers recorded"
              body="Triggers appear once thresholds are crossed."
            />
          )}
        </SectionCard>

        {/* Linked evidence */}
        <div className="lg:col-span-2">
          <SectionCard title="Linked evidence">
            {q.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : d?.linkedEvidence?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Geo</th>
                      <th className="py-2 pr-4">Published</th>
                      <th className="py-2">Relevance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.linkedEvidence.map((e) => (
                      <tr key={e.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          {e.url ? (
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {e.title}
                            </a>
                          ) : (
                            e.title
                          )}
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {e.summary}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {e.sourceHost}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {e.geo?.countryCode ?? e.geo?.regionLabel ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground tabular-nums">
                          {new Date(e.publishedAt).toLocaleString()}
                        </td>
                        <td className="py-3 font-mono tabular-nums">
                          {e.relevanceScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBox
                title="No evidence linked"
                body="As ingestion runs, we’ll surface and dedupe supporting evidence here."
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
