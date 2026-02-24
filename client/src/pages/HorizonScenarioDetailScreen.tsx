import React, { useMemo } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

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
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${cls}`}
    >
      {children}
    </span>
  );
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function SectionCard({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
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

function EmptyBox({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border bg-muted p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

export default function HorizonScenarioDetailScreen() {
  const params = useParams<{ id: string }>();
  const scenarioId = params?.id ?? "";

  const q = trpc.horizon.scenarios.getScenario.useQuery(
    { scenarioId },
    { enabled: Boolean(scenarioId) }
  );

  const scenario = q.data?.scenario;

  const pct = useMemo(() => {
    if (!scenario) return null;
    return Math.round(scenario.probability * 100);
  }, [scenario]);

  const deltaPct = useMemo(() => {
    if (!scenario) return null;
    return Math.round(scenario.delta7d * 100);
  }, [scenario]);

  const deltaSign = (deltaPct ?? 0) > 0 ? "+" : "";

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
            <Link href="/horizon/scenarios" className="hover:underline">
              Scenarios
            </Link>
          </div>

          {q.isLoading ? (
            <>
              <Skeleton className="mt-3 h-8 w-[520px]" />
              <Skeleton className="mt-3 h-4 w-[620px]" />
            </>
          ) : scenario ? (
            <>
              <div className="mt-2 text-3xl font-semibold truncate">{scenario.name}</div>
              <div className="mt-2 text-sm text-muted-foreground">
                {scenario.description ?? "—"}
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {q.isLoading ? (
            <>
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-28" />
            </>
          ) : scenario ? (
            <>
              <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
                <div className="text-xs text-muted-foreground">Probability</div>
                <div className="text-xl font-semibold tabular-nums">{pct}%</div>
              </div>

              <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
                <div className="text-xs text-muted-foreground">7d</div>
                <div className="text-xl font-semibold tabular-nums">
                  {deltaSign}
                  {deltaPct}%
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                <Pill tone={scenario.confidence}>
                  {scenario.confidence.toUpperCase()}
                </Pill>
                <Pill>{scenario.momentum}</Pill>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {q.isError ? (
        <div className="mt-6 rounded-lg border bg-background p-6 shadow-sm">
          <div className="text-sm font-medium">Unable to load scenario</div>
          <div className="mt-2 text-sm text-muted-foreground">{q.error.message}</div>
          <button
            onClick={() => q.refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Loader2 className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {/* Top narrative cards */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SectionCard title="What would we expect to see next?">
          {q.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : q.data?.expectedNext?.length ? (
            <ul className="list-disc pl-5 space-y-2 text-sm">
              {q.data.expectedNext.map((x, idx) => (
                <li key={idx} className="text-muted-foreground">
                  <span className="text-foreground">{x}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBox
              title="No expectations configured"
              body="Add 3–5 expectation bullets to make this scenario executive-readable."
            />
          )}
        </SectionCard>

        <SectionCard title="What would falsify this?">
          {q.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          ) : q.data?.falsifiers?.length ? (
            <ul className="list-disc pl-5 space-y-2 text-sm">
              {q.data.falsifiers.map((x, idx) => (
                <li key={idx} className="text-muted-foreground">
                  <span className="text-foreground">{x}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyBox
              title="No falsifiers configured"
              body="Add 3–5 falsifier bullets so leadership sees how beliefs can change."
            />
          )}
        </SectionCard>
      </div>

      {/* Mid row: contributions + evidence */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Indicator contributions" right={<Link href="/horizon/signals" className="text-sm text-muted-foreground hover:underline">Signals</Link>}>
          {q.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : q.data?.contributions?.length ? (
            <div className="space-y-2">
              {q.data.contributions
                .slice()
                .sort((a, b) => b.contributionScore - a.contributionScore)
                .map((c) => (
                  <a
                    key={c.indicatorId}
                    href={`/horizon/signals/${c.indicatorId}`}
                    className="block rounded-md border px-3 py-2 hover:bg-muted"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{c.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          status: {c.status} • weight:{" "}
                          <span className="font-mono tabular-nums">{c.weight.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-medium font-mono tabular-nums">
                        {c.contributionScore.toFixed(2)}
                      </div>
                    </div>
                  </a>
                ))}
            </div>
          ) : (
            <EmptyBox
              title="No contributions yet"
              body="Once indicators are mapped and thresholds trigger, contributions will appear here."
            />
          )}
        </SectionCard>

        <div className="lg:col-span-2">
          <SectionCard title="Evidence (curated)">
            {q.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : q.data?.evidence?.length ? (
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
                    {q.data.evidence.map((e) => (
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
                        <td className="py-3 pr-4 text-muted-foreground">{e.sourceHost}</td>
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
                title="No evidence captured"
                body="As GDELT ingestion runs, we’ll dedupe and surface the highest-relevance evidence here."
              />
            )}
          </SectionCard>
        </div>
      </div>

      {/* Bottom: belief updates */}
      <div className="mt-6">
        <SectionCard title="Belief update log">
          {q.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : q.data?.beliefUpdates?.length ? (
            <div className="space-y-3">
              {q.data.beliefUpdates
                .slice()
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((u) => {
                  const prior = Math.round(u.prior * 100);
                  const post = Math.round(u.posterior * 100);
                  return (
                    <div key={u.id} className="rounded-md border p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="text-sm text-muted-foreground tabular-nums">
                          {new Date(u.createdAt).toLocaleString()}
                        </div>
                        <div className="text-sm font-medium font-mono tabular-nums">
                          {prior}% → {post}%
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {u.drivers.map((d) => (
                          <a
                            key={d.indicatorId}
                            href={`/horizon/signals/${d.indicatorId}`}
                            className="rounded-md border bg-muted px-2 py-1 text-xs hover:underline"
                          >
                            {d.name}
                          </a>
                        ))}
                      </div>
                      {u.note ? (
                        <div className="mt-3 text-sm text-muted-foreground">{u.note}</div>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          ) : (
            <EmptyBox
              title="No updates logged yet"
              body="Once thresholds trigger and the model updates, entries will appear here with prior → posterior changes."
            />
          )}
        </SectionCard>
      </div>
    </div>
  );
}