import React from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2, Copy } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
  );
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

export default function HorizonReportsScreen() {
  const q = trpc.horizon.reports.generateSentinelBrief.useQuery({});

  const brief = q.data;

  async function copyToClipboard() {
    if (!brief) return;

    const text = [
      brief.title,
      `Generated: ${new Date(brief.generatedAt).toLocaleString()}`,
      "",
      "Executive Summary:",
      ...brief.executiveSummary.map((b) => `- ${b}`),
      "",
      "Scenario Shifts:",
      ...brief.scenarioShifts.map(
        (s) =>
          `- ${s.name}: ${Math.round(s.probability * 100)}% (${Math.round(
            s.delta7d * 100,
          )}% 7d) momentum=${s.momentum}`,
      ),
      "",
      "Key Drivers:",
      ...brief.keyDrivers.map(
        (d) => `- ${d.name} (${d.confidence}): ${d.rationale}`,
      ),
      "",
      "Hotspots:",
      ...brief.hotspots.map((h) => `- ${h.label}: ${h.value}`),
    ].join("\n");

    await navigator.clipboard.writeText(text);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/horizon/overview" className="hover:underline">
              Horizon
            </Link>
            <span className="mx-2">/</span>
            <span>Reports</span>
          </div>
          <div className="mt-2 text-3xl font-semibold">Sentinel Brief</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Executive-ready summary snapshot for partners, funders, and
            leadership.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={copyToClipboard}
            disabled={!brief}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Copy className="h-4 w-4" />
            Copy
          </button>
          <button
            onClick={() => q.refetch()}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Loader2 className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard
            title={brief ? brief.title : "Generating…"}
            right={
              brief ? (
                <span className="text-sm text-muted-foreground">
                  {new Date(brief.generatedAt).toLocaleString()}
                </span>
              ) : null
            }
          >
            {q.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : q.isError ? (
              <div className="text-sm text-muted-foreground">
                {q.error.message}
              </div>
            ) : brief ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Executive Summary
                  </div>
                  <ul className="mt-2 list-disc pl-5 space-y-2 text-sm">
                    {brief.executiveSummary.map((b, idx) => (
                      <li key={idx}>{b}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">
                    Scenario Shifts
                  </div>
                  {brief.scenarioShifts.length ? (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-left text-xs text-muted-foreground">
                          <tr className="border-b">
                            <th className="py-2 pr-4">Scenario</th>
                            <th className="py-2 pr-4">Probability</th>
                            <th className="py-2 pr-4">7d</th>
                            <th className="py-2">Momentum</th>
                          </tr>
                        </thead>
                        <tbody>
                          {brief.scenarioShifts.map((s) => (
                            <tr
                              key={s.scenarioId}
                              className="border-b last:border-b-0"
                            >
                              <td className="py-3 pr-4">
                                <a
                                  href={`/horizon/scenarios/${s.scenarioId}`}
                                  className="hover:underline"
                                >
                                  {s.name}
                                </a>
                              </td>
                              <td className="py-3 pr-4 font-mono tabular-nums">
                                {Math.round(s.probability * 100)}%
                              </td>
                              <td className="py-3 pr-4 font-mono tabular-nums">
                                {Math.round(s.delta7d * 100)}%
                              </td>
                              <td className="py-3">{s.momentum}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                      Scenario shifts not yet populated (seed next).
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Key drivers">
            {q.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : brief?.keyDrivers?.length ? (
              <div className="space-y-3">
                {brief.keyDrivers.map((d) => (
                  <div key={d.indicatorId} className="rounded-md border p-3">
                    <div className="text-sm font-medium">{d.name}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {d.rationale}
                    </div>
                    <div className="mt-2">
                      <a
                        href={`/horizon/signals/${d.indicatorId}`}
                        className="text-sm text-muted-foreground hover:underline"
                      >
                        View indicator →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                Key drivers not yet populated (seed next).
              </div>
            )}
          </SectionCard>

          <SectionCard title="Hotspots">
            {q.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : brief?.hotspots?.length ? (
              <div className="space-y-2">
                {brief.hotspots.map((h, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{h.label}</span>
                    <span className="font-mono tabular-nums">
                      {h.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                Hotspots not yet populated (seed next).
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
