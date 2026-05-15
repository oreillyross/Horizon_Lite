import { useRoute, Link } from "wouter";
import { useRef, useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ArrowLeft, ExternalLink, Scissors, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type FloatingBtn = { text: string; x: number; y: number };
type SnippetPanel = { quote: string };

export default function HorizonWebcutScreen() {
  const [, params] = useRoute("/horizon/gdelt/read/:eventId");
  const eventId = params?.eventId ?? "";
  const { toast } = useToast();

  // --- data queries ---
  const eventQuery = trpc.horizon.gdelt.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );
  const webcutQuery = trpc.horizon.gdelt.webcut.useQuery(
    { url: eventQuery.data?.sourceUrl ?? "" },
    { enabled: !!eventQuery.data?.sourceUrl },
  );
  const indicatorsQuery = trpc.horizon.signals.listIndicators.useQuery(undefined, {
    retry: false,
  });

  // --- snippet capture state ---
  const articleRef = useRef<HTMLDivElement>(null);
  const [floatingBtn, setFloatingBtn] = useState<FloatingBtn | null>(null);
  const [panel, setPanel] = useState<SnippetPanel | null>(null);
  const [indicatorId, setIndicatorId] = useState<string>("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [sessionCount, setSessionCount] = useState(0);
  // Track whether the analyst has manually touched the indicator dropdown
  const userChangedIndicator = useRef(false);

  // --- AI indicator suggestion ---
  const suggestQuery = trpc.horizon.snippets.suggestIndicator.useQuery(
    { quote: panel?.quote ?? "" },
    { enabled: !!panel?.quote, retry: false, staleTime: Infinity },
  );

  // Apply AI suggestion only if analyst hasn't manually chosen
  useEffect(() => {
    if (suggestQuery.data?.suggestedIndicatorId && !userChangedIndicator.current) {
      setIndicatorId(suggestQuery.data.suggestedIndicatorId);
    }
  }, [suggestQuery.data]);

  const showAiBadge =
    !!suggestQuery.data?.suggestedIndicatorId &&
    indicatorId === suggestQuery.data.suggestedIndicatorId &&
    !userChangedIndicator.current;

  const createSnippet = trpc.horizon.snippets.create.useMutation({
    onSuccess: () => {
      setSessionCount((n) => n + 1);
      setPanel(null);
      setIndicatorId("");
      setAnalystNotes("");
      userChangedIndicator.current = false;
      toast({ title: "Snippet captured" });
    },
    onError: (err) => {
      toast({ title: "Failed to save snippet", description: err.message, variant: "destructive" });
    },
  });

  // --- text selection detection ---
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { setFloatingBtn(null); return; }
    const text = sel.toString().trim();
    if (!text || !articleRef.current?.contains(sel.anchorNode)) { setFloatingBtn(null); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setFloatingBtn({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top + window.scrollY - 8,
    });
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  function openPanel() {
    if (!floatingBtn) return;
    userChangedIndicator.current = false;
    setIndicatorId("");
    setPanel({ quote: floatingBtn.text });
    setFloatingBtn(null);
    window.getSelection()?.removeAllRanges();
  }

  function cancelPanel() {
    setPanel(null);
    setIndicatorId("");
    setAnalystNotes("");
    userChangedIndicator.current = false;
  }

  function saveSnippet() {
    if (!panel) return;
    createSnippet.mutate({
      quote: panel.quote,
      sourceUrl: eventQuery.data?.sourceUrl ?? undefined,
      pubDate: eventQuery.data?.ingestedAt
        ? new Date(eventQuery.data.ingestedAt).toISOString()
        : undefined,
      indicatorId: indicatorId || undefined,
      analystNotes: analystNotes || undefined,
      aiSuggestedIndicatorId: suggestQuery.data?.suggestedIndicatorId ?? undefined,
    });
  }

  const event = eventQuery.data;
  const isLoading = eventQuery.isLoading || (!!event?.sourceUrl && webcutQuery.isLoading);
  const error = eventQuery.error ?? webcutQuery.error;
  const indicators = indicatorsQuery.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8 pb-64">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/horizon/overview" className="hover:underline">Horizon</Link>
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

      {/* Session counter */}
      {sessionCount > 0 && (
        <div className="mb-4 rounded-md border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {sessionCount} snippet{sessionCount !== 1 ? "s" : ""} captured this session
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading article…
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <AlertTriangle className="h-8 w-8 text-destructive/60" />
          <p className="text-sm text-destructive">{error.message ?? "Failed to load article."}</p>
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
                    day: "2-digit", month: "short", year: "numeric", timeZone: "UTC",
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
            <p className="mt-2 text-xs text-muted-foreground/70 italic">
              Select any text below to capture a snippet.
            </p>
          </header>

          {webcutQuery.data?.text ? (
            <div
              ref={articleRef}
              className="leading-relaxed whitespace-pre-wrap text-sm text-foreground/90 select-text"
              style={{ maxWidth: "72ch" }}
            >
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
        <div className="text-sm text-muted-foreground py-16 text-center">Event not found.</div>
      )}

      {/* Floating "Create Snippet" button */}
      {floatingBtn && !panel && (
        <button
          style={{
            position: "absolute",
            left: floatingBtn.x,
            top: floatingBtn.y,
            transform: "translate(-50%, -100%)",
            zIndex: 50,
          }}
          onClick={openPanel}
          className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Scissors className="h-3 w-3" />
          Create Snippet
        </button>
      )}

      {/* Inline snippet capture panel — fixed at bottom */}
      {panel && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background shadow-2xl">
          <div className="mx-auto max-w-3xl px-6 py-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Capture Snippet</span>
              <button
                onClick={cancelPanel}
                className="rounded p-1 hover:bg-muted text-muted-foreground"
                aria-label="Close panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* Quote — read only */}
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Quote</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-sm leading-relaxed line-clamp-3">
                  {panel.quote}
                </div>
              </div>

              {/* Source URL — read only */}
              <div className="sm:col-span-2">
                <Label className="text-xs text-muted-foreground mb-1 block">Source URL</Label>
                <div className="rounded-md border bg-muted/50 px-3 py-2 text-xs font-mono text-muted-foreground truncate">
                  {event?.sourceUrl ?? "—"}
                </div>
              </div>

              {/* Indicator dropdown */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-xs text-muted-foreground">Linked Indicator</Label>
                  {showAiBadge && (
                    <Badge
                      variant="outline"
                      className="text-xs gap-1 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400 py-0"
                    >
                      <Sparkles className="h-3 w-3" />
                      AI suggestion
                    </Badge>
                  )}
                </div>
                <Select
                  value={indicatorId}
                  onValueChange={(val) => {
                    userChangedIndicator.current = true;
                    setIndicatorId(val);
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={
                      indicatorsQuery.isLoading ? "Loading…" :
                      suggestQuery.isLoading ? "AI suggesting…" :
                      indicators.length === 0 ? "No indicators" :
                      "Select indicator"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {indicators.map((ind) => (
                      <SelectItem key={ind.id} value={ind.id}>
                        {ind.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Analyst Notes */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">
                  Analyst Notes <span className="text-muted-foreground/60">(optional)</span>
                </Label>
                <Textarea
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  rows={2}
                  className="text-sm resize-none"
                  placeholder="Your notes…"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={cancelPanel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveSnippet}
                disabled={createSnippet.isPending}
              >
                {createSnippet.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
