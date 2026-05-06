import React from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
  );
}

export default function HorizonReportsScreen() {
  const q = trpc.horizon.reports.getThemeBrief.useQuery({});

  const rows = q.data ?? [];

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
            Scenario coverage skeleton — select a theme to populate.
          </div>
        </div>

        <button
          onClick={() => q.refetch()}
          className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Loader2 className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="mt-6">
        {q.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : q.isError ? (
          <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
            {q.error.message}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-md border bg-muted p-6 text-center text-sm text-muted-foreground">
            No theme selected — this report will show scenario coverage once a theme is chosen.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Scenario</th>
                  <th className="px-4 py-3 text-right">Indicators</th>
                  <th className="px-4 py-3 text-right">Signal events</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.scenarioId} className="border-t">
                    <td className="px-4 py-3">
                      <div className="font-medium">{row.name}</div>
                      {row.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                          {row.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {row.indicatorCount}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {row.eventCount}
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
