import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
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

export default function HorizonUpdatesScreen() {
  const [majorOnly, setMajorOnly] = useState(false);

  const input = useMemo(
    () => ({
      // themeId: optional later
      majorOnly: majorOnly ? true : undefined,
    }),
    [majorOnly],
  );

  const q = trpc.horizon.updates.listUpdates.useQuery(input);

  const updates = q.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/horizon/overview" className="hover:underline">
              Horizon
            </Link>
            <span className="mx-2">/</span>
            <span>Updates</span>
          </div>
          <div className="mt-2 text-3xl font-semibold">Updates Ledger</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Decision-intelligence audit trail: prior → posterior with drivers.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={majorOnly}
              onChange={(e) => setMajorOnly(e.target.checked)}
            />
            Major only
          </label>
          <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
            <div className="text-xs text-muted-foreground">Entries</div>
            <div className="text-xl font-semibold tabular-nums">
              {updates.length}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {q.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : q.isError ? (
          <div className="rounded-lg border bg-background p-6 shadow-sm">
            <div className="text-sm font-medium">Unable to load updates</div>
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
        ) : updates.length === 0 ? (
          <EmptyBox
            title="No updates yet"
            body="Once thresholds trigger and the model updates, entries appear here."
          />
        ) : (
          <div className="space-y-3">
            {updates
              .slice()
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((u) => {
                const prior = Math.round(u.prior * 100);
                const post = Math.round(u.posterior * 100);
                return (
                  <div
                    key={u.id}
                    className="rounded-lg border bg-background p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-muted-foreground tabular-nums">
                        {new Date(u.createdAt).toLocaleString()}
                      </div>
                      <div className="font-mono text-sm tabular-nums">
                        {prior}% → {post}%
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-muted-foreground">
                      Scenario:{" "}
                      <a
                        href={`/horizon/scenarios/${u.scenarioId}`}
                        className="text-foreground hover:underline"
                      >
                        {u.scenarioId}
                      </a>
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
                      <div className="mt-3 text-sm text-muted-foreground">
                        {u.note}
                      </div>
                    ) : null}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
