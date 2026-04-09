import { useState } from "react";
import { X, MapPin, Users, Activity } from "lucide-react";
import { EventDetailCoverageTab } from "./EventDetailCoverageTab";

type EventSummary = {
  globalEventId: string;
  numMentions: number | null;
  numSources: number | null;
  avgTone: number | null;
  actor1Name: string | null;
  actor2Name: string | null;
  eventTime: string | null;
  actionGeoFullname: string | null;
};

type Tab = "overview" | "coverage";

type Props = {
  event: EventSummary;
  onClose: () => void;
};

function Stat({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string | number;
  className?: string;
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2.5 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold tabular-nums mt-0.5 ${className}`}>
        {value}
      </div>
    </div>
  );
}

function OverviewTab({ event }: { event: EventSummary }) {
  const toneColor =
    event.avgTone == null
      ? "text-muted-foreground"
      : event.avgTone < -5
      ? "text-red-600"
      : event.avgTone < -2
      ? "text-orange-500"
      : "text-emerald-600";

  return (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Mentions" value={event.numMentions ?? "—"} />
        <Stat label="Sources" value={event.numSources ?? "—"} />
        <Stat
          label="Avg Tone"
          value={event.avgTone != null ? event.avgTone.toFixed(1) : "—"}
          className={toneColor}
        />
        <Stat
          label="Event Time"
          value={
            event.eventTime
              ? new Date(event.eventTime).toLocaleDateString()
              : "—"
          }
        />
      </div>

      <div className="rounded-lg border bg-background p-4 space-y-3">
        {(event.actor1Name || event.actor2Name) && (
          <div className="flex items-start gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">Actors: </span>
              {[event.actor1Name, event.actor2Name].filter(Boolean).join(" ↔ ")}
            </div>
          </div>
        )}

        {event.actionGeoFullname && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-muted-foreground">Location: </span>
              {event.actionGeoFullname}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 text-sm">
          <Activity className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <span className="text-muted-foreground">Event ID: </span>
            <code className="text-xs">{event.globalEventId}</code>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EventDetailModal({ event, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("coverage");

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-2xl max-h-[90dvh] sm:max-h-[85vh] flex flex-col rounded-t-2xl sm:rounded-xl bg-background shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold leading-tight">
              Event Coverage
            </h2>
            {(event.actor1Name || event.actor2Name) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[event.actor1Name, event.actor2Name].filter(Boolean).join(" ↔ ")}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 hover:bg-muted transition-colors text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 flex-shrink-0 border-b pb-0">
          {(["coverage", "overview"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
                activeTab === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "coverage" ? (
            <EventDetailCoverageTab eventId={event.globalEventId} />
          ) : (
            <OverviewTab event={event} />
          )}
        </div>
      </div>
    </div>
  );
}
