import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HorizonWebcutScreen() {
  const [, params] = useRoute("/horizon/gdelt/read/:eventId");
  const eventId = params?.eventId ?? "";

  const eventQuery = trpc.horizon.gdelt.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  const webcutQuery = trpc.horizon.gdelt.webcut.useQuery(
    { url: eventQuery.data?.sourceUrl ?? "" },
    { enabled: !!eventQuery.data?.sourceUrl },
  );

  const event = eventQuery.data;
  const isLoading = eventQuery.isLoading || (!!event?.sourceUrl && webcutQuery.isLoading);
  const error = eventQuery.error ?? webcutQuery.error;

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/horizon/overview" className="hover:underline">
          Horizon
        </Link>
        <span>/</span>
        <Link href="/horizon/gdelt/triage" className="hover:underline flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          GDELT Triage
        </Link>
        {event?.title && (
          <>
            <span>/</span>
            <span className="truncate max-w-xs">{event.title}</span>
          </>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading article…
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-destructive">
            {error.message ?? "Failed to load article."}
          </p>
          {event?.sourceUrl && (
            <Button asChild variant="outline" size="sm">
              <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Open original
              </a>
            </Button>
          )}
        </div>
      )}

      {!isLoading && !error && event && (
        <article>
          <header className="mb-6 border-b pb-4">
            <h1 className="text-2xl font-semibold leading-snug">
              {webcutQuery.data?.title ?? event.title ?? "(untitled)"}
            </h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {event.sourceName && <span>{event.sourceName}</span>}
              {event.countryCode && <span>{event.countryCode}</span>}
              {event.ingestedAt && (
                <span>
                  {new Intl.DateTimeFormat("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(event.ingestedAt))}
                </span>
              )}
              {event.sourceUrl && (
                <a
                  href={event.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Source
                </a>
              )}
            </div>
          </header>

          {webcutQuery.data?.text ? (
            <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed whitespace-pre-wrap text-sm text-foreground/90">
              {webcutQuery.data.text}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No readable text could be extracted from this article.
            </div>
          )}
        </article>
      )}

      {!isLoading && !error && !event && (
        <div className="text-sm text-muted-foreground py-16 text-center">
          Event not found.
        </div>
      )}
    </div>
  );
}
