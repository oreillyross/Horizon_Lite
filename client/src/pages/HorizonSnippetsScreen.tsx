import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

const NO_INDICATOR = "__none__";

function AddSnippetDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [quote, setQuote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [indicatorId, setIndicatorId] = useState("");
  const [analystNotes, setAnalystNotes] = useState("");

  const indicatorsQuery = trpc.horizon.signals.listIndicators.useQuery(undefined, {
    retry: false,
  });
  const indicators = indicatorsQuery.data ?? [];

  const createSnippet = trpc.horizon.snippets.create.useMutation({
    onSuccess: () => {
      toast({ title: "Snippet added" });
      setQuote("");
      setSourceUrl("");
      setIndicatorId("");
      setAnalystNotes("");
      onSaved();
    },
    onError: (err) => {
      toast({ title: "Failed to add snippet", description: err.message, variant: "destructive" });
    },
  });

  function handleSave() {
    if (!quote.trim()) return;
    createSnippet.mutate({
      quote: quote.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      indicatorId: indicatorId && indicatorId !== NO_INDICATOR ? indicatorId : undefined,
      analystNotes: analystNotes.trim() || undefined,
    });
  }

  function handleClose() {
    setQuote("");
    setSourceUrl("");
    setIndicatorId("");
    setAnalystNotes("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Snippet</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Quote <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={4}
              className="text-sm resize-none"
              placeholder="Paste or type the text you want to capture…"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Source URL <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
              className="text-sm h-8"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">
              Linked Indicator <span className="text-muted-foreground/60">(optional)</span>
            </Label>
            <Select
              value={indicatorId}
              onValueChange={setIndicatorId}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder={
                  indicatorsQuery.isLoading ? "Loading…" :
                  indicators.length === 0 ? "No indicators yet" :
                  "Select indicator"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_INDICATOR}>None</SelectItem>
                {indicators.map((ind) => (
                  <SelectItem key={ind.id} value={ind.id}>
                    {ind.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!quote.trim() || createSnippet.isPending}
          >
            {createSnippet.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Save Snippet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function HorizonSnippetsScreen() {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const utils = trpc.useUtils();
  const snippetsQuery = trpc.horizon.snippets.list.useQuery();
  const snippets = snippetsQuery.data ?? [];

  const deleteSnippet = trpc.horizon.snippets.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Snippet deleted" });
      void utils.horizon.snippets.list.invalidate();
    },
    onError: (err) => {
      toast({ title: "Failed to delete snippet", description: err.message, variant: "destructive" });
    },
  });

  function handleDelete(id: string) {
    deleteSnippet.mutate({ id });
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/horizon/overview" className="hover:underline">
              Horizon
            </Link>
            <span className="mx-2">/</span>
            <span>Snippets</span>
          </div>
          <div className="mt-2 text-3xl font-semibold">Snippets</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Captured quotes and analyst notes linked to indicators.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-xl font-semibold tabular-nums">{snippets.length}</div>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add Snippet
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {snippetsQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : snippetsQuery.isError ? (
          <div className="rounded-lg border bg-background p-6 shadow-sm">
            <div className="text-sm font-medium">Unable to load snippets</div>
            <div className="mt-2 text-sm text-muted-foreground">{snippetsQuery.error.message}</div>
            <button
              onClick={() => snippetsQuery.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Loader2 className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : snippets.length === 0 ? (
          <div className="rounded-md border bg-muted p-8 text-center">
            <Scissors className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
            <div className="text-sm font-medium">No snippets yet</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Capture snippets from articles in GDELT Triage, or add one manually.
            </div>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Snippet
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {snippets.map((s) => (
              <div key={s.id} className="rounded-lg border bg-background p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <blockquote className="text-sm leading-relaxed text-foreground/90 border-l-2 border-primary/40 pl-3 flex-1">
                    {s.quote ?? s.content}
                  </blockquote>
                  <button
                    onClick={() => handleDelete(s.id)}
                    disabled={deleteSnippet.isPending}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                    aria-label="Delete snippet"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {s.indicatorName && (
                    <Badge variant="outline" className="text-xs">
                      {s.indicatorName}
                    </Badge>
                  )}
                  {s.sourceUrl && (
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Source
                    </a>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(s.createdAt))}
                  </span>
                </div>

                {s.analystNotes && (
                  <div className="mt-2 text-xs text-muted-foreground italic">
                    {s.analystNotes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddSnippetDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          void utils.horizon.snippets.list.invalidate();
        }}
      />
    </div>
  );
}
