import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { useInView } from "react-intersection-observer";
import { Loader2, MapPin, Users, BarChart2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EventDetailModal } from "@/components/intelfeed/EventDetailModal";

type EventItem = {
  globalEventId: string;
  eventTime: string | null;
  actor1Name: string | null;
  actor2Name: string | null;
  eventCode: string | null;
  numMentions: number | null;
  numSources: number | null;
  avgTone: number | null;
  actionGeoFullname: string | null;
};

function toneColor(tone: number | null): string {
  if (tone == null) return "text-muted-foreground";
  if (tone < -5) return "text-red-600";
  if (tone < -2) return "text-orange-500";
  return "text-emerald-600";
}

function MentionBar({ count }: { count: number | null }) {
  const n = count ?? 0;
  // Cap visual bar at 200 mentions
  const pct = Math.min(100, (n / 200) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground/40"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular-nums text-xs">{n}</span>
    </div>
  );
}

function EventRow({
  event,
  onSelect,
}: {
  event: EventItem;
  onSelect: (e: EventItem) => void;
}) {
  const actors = [event.actor1Name, event.actor2Name].filter(Boolean);

  return (
    <tr
      className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onSelect(event)}
    >
      {/* Actors */}
      <td className="py-3 px-4">
        {actors.length > 0 ? (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <span className="truncate max-w-[200px]">{actors.join(" ↔ ")}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">(unknown actors)</span>
        )}
      </td>

      {/* Geo */}
      <td className="py-3 px-4 hidden sm:table-cell">
        {event.actionGeoFullname ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate max-w-[180px]">{event.actionGeoFullname}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </td>

      {/* Mentions bar */}
      <td className="py-3 px-4">
        <MentionBar count={event.numMentions} />
      </td>

      {/* Tone */}
      <td className={`py-3 px-4 text-sm tabular-nums font-medium ${toneColor(event.avgTone)}`}>
        {event.avgTone != null ? event.avgTone.toFixed(1) : "—"}
      </td>

      {/* Time */}
      <td className="py-3 px-4 text-sm text-muted-foreground tabular-nums whitespace-nowrap hidden md:table-cell">
        {event.eventTime
          ? new Date(event.eventTime).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—"}
      </td>

      {/* Coverage CTA */}
      <td className="py-3 px-4">
        {(event.numMentions ?? 0) >= 3 ? (
          <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
            <BarChart2 className="h-3.5 w-3.5" />
            Coverage
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

function Skeleton() {
  return (
    <tr className="border-b">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function IntelEventsPage() {
  const [q, setQ] = useState("");
  const [debounced] = useDebounce(q, 350);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const { ref, inView } = useInView();

  const query = trpc.intel.listEvents.useInfiniteQuery(
    { limit: 30, q: debounced.length >= 2 ? debounced : undefined },
    { getNextPageParam: (last) => last.nextCursor ?? undefined },
  );

  useEffect(() => {
    if (inView && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage();
    }
  }, [inView, query]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GDELT events with multi-source coverage. Click any row to explore narrative clusters.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          className="h-10 w-full max-w-sm rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Filter by actor or location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr>
              <th className="py-3 px-4 font-medium">Actors</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">Location</th>
              <th className="py-3 px-4 font-medium">Mentions</th>
              <th className="py-3 px-4 font-medium">Tone</th>
              <th className="py-3 px-4 font-medium hidden md:table-cell">Date</th>
              <th className="py-3 px-4 font-medium">Coverage</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading
              ? [...Array(8)].map((_, i) => <Skeleton key={i} />)
              : query.isError
              ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-sm text-muted-foreground">
                    Failed to load events — {query.error?.message}
                  </td>
                </tr>
              )
              : items.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="py-8 px-4 text-center text-sm text-muted-foreground">
                    {debounced.length >= 2 ? "No events match your search." : "No events found."}
                  </td>
                </tr>
              )
              : items.map((event) => (
                <EventRow key={event.globalEventId} event={event} onSelect={setSelectedEvent} />
              ))}

            {query.isFetchingNextPage && <Skeleton />}
          </tbody>
        </table>
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={ref} className="h-10" />

      {/* Coverage modal */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
