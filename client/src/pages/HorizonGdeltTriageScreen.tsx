import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Flag, SkipForward, Loader2, Inbox, BookOpen } from "lucide-react";

type TriageItem = {
  globalEventId: string;
  title: string | null;
  sourceName: string | null;
  ingestedAt: string;
  countryCode: string | null;
  geoFullname: string | null;
  sourceUrl: string | null;
  status: string;
  actor1Name: string | null;
  actor2Name: string | null;
  numMentions: number | null;
  goldstein: number | null;
};

function truncateUrl(url: string | null): string {
  if (!url) return "—";
  try {
    const u = new URL(url);
    const path = u.pathname.length > 40 ? u.pathname.slice(0, 40) + "…" : u.pathname;
    return u.hostname + path;
  } catch {
    return url.length > 60 ? url.slice(0, 60) + "…" : url;
  }
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function displayTitle(item: TriageItem): string {
  if (item.title) return item.title;
  const actors = [item.actor1Name, item.actor2Name].filter(Boolean).join(" → ");
  if (actors) return actors;
  if (item.geoFullname) return item.geoFullname;
  return truncateUrl(item.sourceUrl) || "—";
}

function formatGoldstein(g: number | null): string | null {
  if (g == null) return null;
  return (g >= 0 ? "+" : "") + g.toFixed(1);
}

function NewEventCard({
  item,
  onFlag,
  onSkip,
  isPending,
}: {
  item: TriageItem;
  onFlag: () => void;
  onSkip: () => void;
  isPending: boolean;
}) {
  const goldsteinStr = formatGoldstein(item.goldstein);
  const actorLine = [item.actor1Name, item.actor2Name].filter(Boolean).join(" → ");

  return (
    <div
      className="flex items-start gap-4 rounded-lg border bg-card px-4 py-3 transition-opacity"
      style={{ opacity: isPending ? 0.5 : 1 }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-sm text-foreground">
            {displayTitle(item)}
          </span>
          {item.countryCode && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {item.countryCode}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {actorLine && <span className="font-medium text-foreground/70">{actorLine}</span>}
          {item.geoFullname && !actorLine && <span>{item.geoFullname}</span>}
          {item.sourceName && <span>{item.sourceName}</span>}
          <span>{formatDate(item.ingestedAt)}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {item.numMentions != null && item.numMentions > 0 && (
            <span>{item.numMentions.toLocaleString()} mentions</span>
          )}
          {goldsteinStr && (
            <span
              className={
                item.goldstein != null && item.goldstein < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }
            >
              Goldstein {goldsteinStr}
            </span>
          )}
          <span className="truncate font-mono">{truncateUrl(item.sourceUrl)}</span>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
          onClick={onFlag}
          disabled={isPending}
          aria-label="Flag event"
        >
          <Flag className="h-3.5 w-3.5" />
          Flag
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs text-muted-foreground hover:bg-muted"
          onClick={onSkip}
          disabled={isPending}
          aria-label="Skip event"
        >
          <SkipForward className="h-3.5 w-3.5" />
          Skip
        </Button>
      </div>
    </div>
  );
}

function FlaggedEventCard({ item }: { item: TriageItem }) {
  const actorLine = [item.actor1Name, item.actor2Name].filter(Boolean).join(" → ");

  const docQuery = trpc.intel.eventsByDocUrl.useQuery(
    { url: item.sourceUrl ?? "" },
    { enabled: !!item.sourceUrl, staleTime: 10 * 60 * 1000 },
  );
  const docTitle = docQuery.data?.[0]?.docTitle ?? null;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-emerald-200 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/horizon/gdelt/read/${item.globalEventId}`}
            className="truncate font-medium text-sm text-foreground hover:underline"
          >
            {displayTitle(item)}
          </Link>
          {item.countryCode && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {item.countryCode}
            </Badge>
          )}
          <Badge className="shrink-0 text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300">
            flagged
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {actorLine && <span className="font-medium text-foreground/70">{actorLine}</span>}
          {item.geoFullname && !actorLine && <span>{item.geoFullname}</span>}
          {item.sourceName && <span>{item.sourceName}</span>}
          <span>{formatDate(item.ingestedAt)}</span>
          <span className="truncate font-mono">{truncateUrl(item.sourceUrl)}</span>
        </div>
        {docTitle && (
          <div className="mt-1 text-xs text-muted-foreground">
            <em>{docTitle}</em>
          </div>
        )}
      </div>
      <Link href={`/horizon/gdelt/read/${item.globalEventId}`}>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs shrink-0"
          aria-label="Read article"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Read
        </Button>
      </Link>
    </div>
  );
}

export default function HorizonGdeltTriageScreen() {
  const utils = trpc.useUtils();

  const newQuery = trpc.horizon.gdelt.list.useInfiniteQuery(
    { limit: 30, status: "new" },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  const flaggedQuery = trpc.horizon.gdelt.list.useInfiniteQuery(
    { limit: 20, status: "flagged" },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  const setStatus = trpc.horizon.gdelt.setStatus.useMutation({
    onMutate: async ({ id }) => {
      await utils.horizon.gdelt.list.cancel({ limit: 30, status: "new" });
      const prev = utils.horizon.gdelt.list.getInfiniteData({ limit: 30, status: "new" });

      utils.horizon.gdelt.list.setInfiniteData({ limit: 30, status: "new" }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.globalEventId !== id),
          })),
        };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.horizon.gdelt.list.setInfiniteData({ limit: 30, status: "new" }, ctx.prev);
      }
    },
    onSettled: () => {
      void utils.horizon.gdelt.countNew.invalidate();
      void utils.horizon.gdelt.list.invalidate({ limit: 30, status: "new" });
      void utils.horizon.gdelt.list.invalidate({ limit: 20, status: "flagged" });
    },
  });

  const { ref: newSentinelRef, inView: newInView } = useInView({ threshold: 0 });
  const { ref: flaggedSentinelRef, inView: flaggedInView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (newInView && newQuery.hasNextPage && !newQuery.isFetchingNextPage) {
      void newQuery.fetchNextPage();
    }
  }, [newInView, newQuery.hasNextPage, newQuery.isFetchingNextPage]);

  useEffect(() => {
    if (flaggedInView && flaggedQuery.hasNextPage && !flaggedQuery.isFetchingNextPage) {
      void flaggedQuery.fetchNextPage();
    }
  }, [flaggedInView, flaggedQuery.hasNextPage, flaggedQuery.isFetchingNextPage]);

  const newItems = newQuery.data?.pages.flatMap((p) => p.items) ?? [];
  const flaggedItems = flaggedQuery.data?.pages.flatMap((p) => p.items) ?? [];

  const pendingId =
    setStatus.isPending && setStatus.variables ? setStatus.variables.id : null;

  return (
    <div className="mx-auto max-w-4xl px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="text-sm text-muted-foreground">
          <Link href="/horizon/overview" className="hover:underline">
            Horizon
          </Link>
          <span className="mx-2">/</span>
          <span>GDELT Triage</span>
        </div>
        <div className="mt-2 text-3xl font-semibold">GDELT Triage</div>
        <div className="mt-1 text-sm text-muted-foreground">
          Flag events for deeper reading or skip to clear the queue.
        </div>
      </div>

      {/* Flagged events — shown first so the analyst can act on them immediately */}
      {(flaggedItems.length > 0 || flaggedQuery.isLoading) && (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Flagged — ready to read
          </h2>

          {flaggedQuery.isLoading && (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          <div className="flex flex-col gap-2">
            {flaggedItems.map((item) => (
              <FlaggedEventCard key={item.globalEventId} item={item} />
            ))}
          </div>

          <div ref={flaggedSentinelRef} className="py-2 flex justify-center">
            {flaggedQuery.isFetchingNextPage && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </section>
      )}

      {/* New events */}
      <section className="mb-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          New
        </h2>

        {newQuery.isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading events…
          </div>
        )}

        {newQuery.isError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            Failed to load events.{" "}
            <button onClick={() => newQuery.refetch()} className="underline">
              Retry
            </button>
          </div>
        )}

        {!newQuery.isLoading && !newQuery.isError && newItems.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-muted-foreground">
            <Inbox className="h-8 w-8 opacity-40" />
            <p className="text-sm">No new events to triage.</p>
          </div>
        )}

        {newItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {newItems.map((item) => (
              <NewEventCard
                key={item.globalEventId}
                item={item}
                isPending={pendingId === item.globalEventId}
                onFlag={() =>
                  setStatus.mutate({ id: item.globalEventId, status: "flagged" })
                }
                onSkip={() =>
                  setStatus.mutate({ id: item.globalEventId, status: "skipped" })
                }
              />
            ))}
          </div>
        )}

        <div ref={newSentinelRef} className="py-2 flex justify-center">
          {newQuery.isFetchingNextPage && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </section>
    </div>
  );
}
