import { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { useInView } from "react-intersection-observer";
import { MapPin, Users, BarChart2, SlidersHorizontal } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EventDetailModal } from "@/components/intelfeed/EventDetailModal";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
  goldstein: number | null;
  numArticles: number | null;
  eventCodeName: string | null;
};

// ─── Column system ────────────────────────────────────────────────────────────

type ColumnKey =
  | "actors"
  | "location"
  | "mentions"
  | "tone"
  | "date"
  | "coverage"
  | "eventType"
  | "sources"
  | "goldstein";

type ColumnDef = {
  key: ColumnKey;
  label: string;
  defaultVisible: boolean;
  renderHeader: () => React.ReactNode;
  renderCell: (event: EventItem) => React.ReactNode;
};

function toneColor(tone: number | null): string {
  if (tone == null) return "text-muted-foreground";
  if (tone < -5) return "text-red-600";
  if (tone < -2) return "text-orange-500";
  return "text-emerald-600";
}

function MentionBar({ count }: { count: number | null }) {
  const n = count ?? 0;
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

const COLUMN_DEFS: ColumnDef[] = [
  {
    key: "actors",
    label: "Actors",
    defaultVisible: true,
    renderHeader: () => "Actors",
    renderCell: (event) => {
      const actors = [event.actor1Name, event.actor2Name].filter(Boolean);
      return actors.length > 0 ? (
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Users className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="truncate max-w-[200px]">{actors.join(" ↔ ")}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">(unknown actors)</span>
      );
    },
  },
  {
    key: "location",
    label: "Location",
    defaultVisible: true,
    renderHeader: () => "Location",
    renderCell: (event) =>
      event.actionGeoFullname ? (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate max-w-[180px]">{event.actionGeoFullname}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    key: "mentions",
    label: "Mentions",
    defaultVisible: true,
    renderHeader: () => "Mentions",
    renderCell: (event) => <MentionBar count={event.numMentions} />,
  },
  {
    key: "tone",
    label: "Tone",
    defaultVisible: true,
    renderHeader: () => "Tone",
    renderCell: (event) => (
      <span className={`text-sm tabular-nums font-medium ${toneColor(event.avgTone)}`}>
        {event.avgTone != null ? event.avgTone.toFixed(1) : "—"}
      </span>
    ),
  },
  {
    key: "date",
    label: "Date",
    defaultVisible: true,
    renderHeader: () => "Date",
    renderCell: (event) => (
      <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
        {event.eventTime
          ? new Date(event.eventTime).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—"}
      </span>
    ),
  },
  {
    key: "coverage",
    label: "Coverage",
    defaultVisible: true,
    renderHeader: () => "Coverage",
    renderCell: (event) =>
      (event.numMentions ?? 0) >= 3 ? (
        <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
          <BarChart2 className="h-3.5 w-3.5" />
          Coverage
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    key: "eventType",
    label: "Event Type",
    defaultVisible: false,
    renderHeader: () => "Event Type",
    renderCell: (event) => (
      <span className="text-sm text-muted-foreground">
        {event.eventCodeName ?? event.eventCode ?? "—"}
      </span>
    ),
  },
  {
    key: "sources",
    label: "Sources",
    defaultVisible: false,
    renderHeader: () => "Sources",
    renderCell: (event) => (
      <span className="text-sm tabular-nums">
        {event.numSources != null ? event.numSources : "—"}
      </span>
    ),
  },
  {
    key: "goldstein",
    label: "Goldstein",
    defaultVisible: false,
    renderHeader: () => "Goldstein",
    renderCell: (event) => (
      <span
        className={`text-sm tabular-nums font-medium ${
          event.goldstein == null
            ? "text-muted-foreground"
            : event.goldstein < 0
            ? "text-orange-500"
            : "text-emerald-600"
        }`}
      >
        {event.goldstein != null ? event.goldstein.toFixed(1) : "—"}
      </span>
    ),
  },
];

const DEFAULT_VISIBLE = new Set<ColumnKey>(
  COLUMN_DEFS.filter((c) => c.defaultVisible).map((c) => c.key),
);
const LS_KEY = "events-columns";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useColumnVisibility(): [Set<ColumnKey>, (key: ColumnKey, on: boolean) => void] {
  const [visible, setVisible] = useState<Set<ColumnKey>>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return new Set(JSON.parse(stored) as ColumnKey[]);
    } catch {
      // ignore parse errors
    }
    return DEFAULT_VISIBLE;
  });

  const toggle = (key: ColumnKey, on: boolean) => {
    setVisible((prev) => {
      if (!on && prev.size <= 1) return prev; // prevent empty set
      const next = new Set(prev);
      on ? next.add(key) : next.delete(key);
      localStorage.setItem(LS_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  return [visible, toggle];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ColumnPicker({
  visible,
  onToggle,
}: {
  visible: Set<ColumnKey>;
  onToggle: (key: ColumnKey, on: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {COLUMN_DEFS.map((col) => (
          <DropdownMenuCheckboxItem
            key={col.key}
            checked={visible.has(col.key)}
            onCheckedChange={(checked) => onToggle(col.key, !!checked)}
          >
            {col.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function EventRow({
  event,
  visibleColumns,
  onSelect,
}: {
  event: EventItem;
  visibleColumns: Set<ColumnKey>;
  onSelect: (e: EventItem) => void;
}) {
  return (
    <tr
      className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => onSelect(event)}
    >
      {COLUMN_DEFS.filter((col) => visibleColumns.has(col.key)).map((col) => (
        <td key={col.key} className="py-3 px-4">
          {col.renderCell(event)}
        </td>
      ))}
    </tr>
  );
}

function Skeleton({ columnCount }: { columnCount: number }) {
  return (
    <tr className="border-b">
      {[...Array(columnCount)].map((_, i) => (
        <td key={i} className="py-3 px-4">
          <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + i * 8}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IntelEventsPage() {
  const [q, setQ] = useState("");
  const [debounced] = useDebounce(q, 350);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [visibleColumns, toggleColumn] = useColumnVisibility();

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
  const activeColumnCount = COLUMN_DEFS.filter((c) => visibleColumns.has(c.key)).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          GDELT events with multi-source coverage. Click any row to explore narrative clusters.
        </p>
      </div>

      {/* Search + column picker */}
      <div className="mb-4 flex items-center gap-2">
        <input
          className="h-10 w-full max-w-sm rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Filter by actor or location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <ColumnPicker visible={visibleColumns} onToggle={toggleColumn} />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr>
              {COLUMN_DEFS.filter((col) => visibleColumns.has(col.key)).map((col) => (
                <th key={col.key} className="py-3 px-4 font-medium">
                  {col.renderHeader()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {query.isLoading
              ? [...Array(8)].map((_, i) => (
                  <Skeleton key={i} columnCount={activeColumnCount} />
                ))
              : query.isError
              ? (
                <tr>
                  <td colSpan={activeColumnCount} className="py-8 px-4 text-center text-sm text-muted-foreground">
                    Failed to load events — {query.error?.message}
                  </td>
                </tr>
              )
              : items.length === 0
              ? (
                <tr>
                  <td colSpan={activeColumnCount} className="py-8 px-4 text-center text-sm text-muted-foreground">
                    {debounced.length >= 2 ? "No events match your search." : "No events found."}
                  </td>
                </tr>
              )
              : items.map((event) => (
                <EventRow
                  key={event.globalEventId}
                  event={event}
                  visibleColumns={visibleColumns}
                  onSelect={setSelectedEvent}
                />
              ))}

            {query.isFetchingNextPage && (
              <Skeleton columnCount={activeColumnCount} />
            )}
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
