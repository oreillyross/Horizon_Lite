import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { EventDetailModal } from "@/components/intelfeed/EventDetailModal";

type Props = {
  doc: {
    url: string;
    domain: string;
    title: string;
    image_url: string | null;
    published_at: string;
    tone: number;
    themes: string[];
    organizations: string[];
  };
};

export function FeedCard({ doc }: Props) {
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [lookupRequested, setLookupRequested] = useState(false);

  // Lazy: only fires the network request once the user clicks "Coverage"
  const eventQuery = trpc.intel.eventsByDocUrl.useQuery(
    { url: doc.url },
    { enabled: lookupRequested, staleTime: 10 * 60 * 1000 },
  );

  const topEvent = eventQuery.data?.[0];

  // Once data arrives after the user clicked, open the modal
  useEffect(() => {
    if (lookupRequested && topEvent) {
      setCoverageOpen(true);
    }
  }, [lookupRequested, topEvent]);

  const toneColor =
    doc.tone < -5
      ? "text-red-600"
      : doc.tone < -2
      ? "text-orange-500"
      : "text-gray-600";

  function handleCoverageClick() {
    if (topEvent) {
      // Already loaded
      setCoverageOpen(true);
    } else {
      // Trigger the lookup; useEffect above will open modal when it resolves
      setLookupRequested(true);
    }
  }

  return (
    <>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex justify-between text-sm text-gray-500">
          <span>{doc.domain}</span>
          <span>{new Date(doc.published_at).toLocaleString()}</span>
        </div>

        <h3 className="text-lg font-semibold">{doc.title}</h3>

        <div className={`text-sm ${toneColor}`}>Tone: {doc.tone}</div>

        <div className="flex flex-wrap gap-2">
          {doc.themes?.slice(0, 5).map((theme) => (
            <span key={theme} className="text-xs bg-gray-100 px-2 py-1 rounded">
              {theme}
            </span>
          ))}
        </div>

        <div className="flex gap-4 text-sm">
          <a href={doc.url} target="_blank" className="text-blue-600">
            Open Article
          </a>

          <button className="text-blue-600">Webcut</button>

          <button className="text-blue-600">Capture Snippet</button>

          {/* Coverage button: loading state → hidden (no event) → clickable */}
          {lookupRequested && eventQuery.isLoading ? (
            <span className="text-gray-400 cursor-default">Loading…</span>
          ) : lookupRequested && !topEvent ? null : (
            <button onClick={handleCoverageClick} className="text-blue-600">
              Coverage
            </button>
          )}
        </div>
      </div>

      {coverageOpen && topEvent && (
        <EventDetailModal
          event={topEvent}
          onClose={() => setCoverageOpen(false)}
        />
      )}
    </>
  );
}
