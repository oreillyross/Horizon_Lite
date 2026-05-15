import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Flag, SkipForward, Loader2, Inbox } from "lucide-react";

type TriageItem = {
  globalEventId: string;
  title: string | null;
  sourceName: string | null;
  ingestedAt: string;
  countryCode: string | null;
  sourceUrl: string | null;
  status: string;
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

function EventCard({
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
  return (
    <div className="flex items-start gap-4 rounded-lg border bg-card px-4 py-3 transition-opacity data-[pending=true]:opacity-50">
      <div className="min-w-0 flex-1" data-pending={isPending}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-sm text-foreground">
            {item.title ?? "(untitled)"}
          </span>
          {item.countryCode && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {item.countryCode}
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
          {item.sourceName && <span>{item.sourceName}</span>}
          <span>{formatDate(item.ingestedAt)}</span>
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

export default function HorizonGdeltTriageScreen() {
  const utils = trpc.useUtils();

  const query = trpc.horizon.gdelt.list.useInfiniteQuery(
    { limit: 30 },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  const setStatus = trpc.horizon.gdelt.setStatus.useMutation({
    onMutate: async ({ id, status }) => {
      await utils.horizon.gdelt.list.cancel();
      const prev = utils.horizon.gdelt.list.getInfiniteData({ limit: 30 });

      utils.horizon.gdelt.list.setInfiniteData({ limit: 30 }, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.filter((item) => item.globalEventId !== id),
          })),
        };
      });

      return { prev, id, status };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        utils.horizon.gdelt.list.setInfiniteData({ limit: 30 }, ctx.prev);
      }
    },
    onSettled: () => {
      void utils.horizon.gdelt.countNew.invalidate();
      void utils.horizon.gdelt.list.invalidate();
    },
  });

  const { ref: sentinelRef, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  }, [inView, query.hasNextPage, query.isFetchingNextPage]);

  const allItems = query.data?.pages.flatMap((p) => p.items) ?? [];
  const pendingIds = new Set(
    setStatus.isPending && setStatus.variables
      ? [setStatus.variables.id]
      : [],
  );

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

      {query.isLoading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading events…
        </div>
      )}

      {query.isError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Failed to load events.{" "}
          <button onClick={() => query.refetch()} className="underline">
            Retry
          </button>
        </div>
      )}

      {!query.isLoading && !query.isError && allItems.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
          <Inbox className="h-10 w-10 opacity-40" />
          <p className="text-sm">No new events to triage.</p>
        </div>
      )}

      {allItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {allItems.map((item) => (
            <EventCard
              key={item.globalEventId}
              item={item}
              isPending={pendingIds.has(item.globalEventId)}
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

      <div ref={sentinelRef} className="py-4 flex justify-center">
        {query.isFetchingNextPage && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
    </div>
  );
}
