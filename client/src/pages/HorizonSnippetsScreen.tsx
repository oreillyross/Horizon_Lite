import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Scissors,
  Pencil,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { IndicatorQuickCreate } from "@/components/IndicatorQuickCreate";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

const NO_INDICATOR = "__none__";
const CREATE_NEW_INDICATOR = "__create_new__";

type Snippet = {
  id: string;
  quote: string | null;
  content: string | null;
  sourceUrl: string | null;
  pubDate: string | null;
  indicatorId: string | null;
  indicatorName: string | null;
  analystNotes: string | null;
  aiSuggestedIndicatorId: string | null;
  createdAt: string;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

// Inline editor for changing a snippet's indicator and notes
function SnippetEditRow({
  snippet,
  onDone,
}: {
  snippet: Snippet;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const indicatorsQuery = trpc.horizon.signals.listIndicators.useQuery(undefined, { retry: false });
  const fetchedIndicators = indicatorsQuery.data ?? [];

  const [sessionIndicators, setSessionIndicators] = useState<{ id: string; name: string }[]>([]);
  const indicators = [
    ...fetchedIndicators,
    ...sessionIndicators.filter((s) => !fetchedIndicators.some((f) => f.id === s.id)),
  ];

  const [indicatorId, setIndicatorId] = useState<string>(snippet.indicatorId ?? NO_INDICATOR);
  const [analystNotes, setAnalystNotes] = useState<string>(snippet.analystNotes ?? "");
  const [creatingIndicator, setCreatingIndicator] = useState(false);
  const indicatorBeforeCreate = { current: indicatorId };

  const updateSnippet = trpc.horizon.snippets.update.useMutation({
    onSuccess: () => {
      toast({ title: "Snippet updated" });
      void utils.horizon.snippets.list.invalidate();
      onDone();
    },
    onError: (err) => {
      toast({ title: "Failed to update snippet", description: err.message, variant: "destructive" });
    },
  });

  function handleSave() {
    updateSnippet.mutate({
      id: snippet.id,
      indicatorId: indicatorId && indicatorId !== NO_INDICATOR ? indicatorId : null,
      analystNotes: analystNotes.trim() || undefined,
    });
  }

  return (
    <div className="mt-3 rounded-md border bg-muted/20 p-3 space-y-3">
      <div>
        <Label className="text-xs text-muted-foreground mb-1 block">Linked Indicator</Label>
        {creatingIndicator ? (
          <IndicatorQuickCreate
            onCreated={(id, name) => {
              setSessionIndicators((prev) => [...prev, { id, name }]);
              setIndicatorId(id);
              setCreatingIndicator(false);
            }}
            onCancel={() => {
              setCreatingIndicator(false);
              setIndicatorId(indicatorBeforeCreate.current);
            }}
          />
        ) : (
          <Select
            value={indicatorId}
            onValueChange={(val) => {
              if (val === CREATE_NEW_INDICATOR) {
                indicatorBeforeCreate.current = indicatorId;
                setCreatingIndicator(true);
                return;
              }
              setIndicatorId(val);
            }}
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
              <SelectItem value={CREATE_NEW_INDICATOR}>+ Create new indicator…</SelectItem>
            </SelectContent>
          </Select>
        )}
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

      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onDone}>
          <X className="h-3 w-3 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={updateSnippet.isPending}
        >
          {updateSnippet.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  );
}

function SnippetCard({ snippet, onDeleted }: { snippet: Snippet; onDeleted: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const deleteSnippet = trpc.horizon.snippets.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Snippet deleted" });
      void utils.horizon.snippets.list.invalidate();
      onDeleted();
    },
    onError: (err) => {
      toast({ title: "Failed to delete snippet", description: err.message, variant: "destructive" });
    },
  });

  const isAiSuggested =
    !!snippet.aiSuggestedIndicatorId &&
    snippet.aiSuggestedIndicatorId === snippet.indicatorId;

  const displayDate = snippet.pubDate ?? snippet.createdAt;

  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <blockquote className="text-sm leading-relaxed text-foreground/90 border-l-2 border-primary/40 pl-3 flex-1">
          {snippet.quote ?? snippet.content}
        </blockquote>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Edit snippet"
          >
            {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={deleteSnippet.isPending}
                className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                aria-label="Delete snippet"
              >
                {deleteSnippet.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete snippet?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this captured snippet. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => deleteSnippet.mutate({ id: snippet.id })}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isAiSuggested && (
          <Badge
            variant="outline"
            className="text-xs gap-1 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400"
          >
            <Sparkles className="h-3 w-3" />
            AI suggestion
          </Badge>
        )}

        <span className="text-xs text-muted-foreground ml-auto tabular-nums">
          {formatDate(displayDate)}
        </span>
      </div>

      {snippet.analystNotes && !editing && (
        <div className="mt-2 text-xs text-muted-foreground italic">{snippet.analystNotes}</div>
      )}

      {editing && (
        <SnippetEditRow snippet={snippet} onDone={() => setEditing(false)} />
      )}
    </div>
  );
}

// ---- Add Snippet Dialog ----

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
  const [creatingIndicator, setCreatingIndicator] = useState(false);
  const [sessionIndicators, setSessionIndicators] = useState<{ id: string; name: string }[]>([]);

  const indicatorsQuery = trpc.horizon.signals.listIndicators.useQuery(undefined, { retry: false });
  const fetchedIndicators = indicatorsQuery.data ?? [];
  const indicators = [
    ...fetchedIndicators,
    ...sessionIndicators.filter((s) => !fetchedIndicators.some((f) => f.id === s.id)),
  ];
  const utils = trpc.useUtils();

  const createSnippet = trpc.horizon.snippets.create.useMutation({
    onSuccess: () => {
      toast({ title: "Snippet added" });
      resetForm();
      onSaved();
    },
    onError: (err) => {
      toast({ title: "Failed to add snippet", description: err.message, variant: "destructive" });
    },
  });

  function resetForm() {
    setQuote("");
    setSourceUrl("");
    setIndicatorId("");
    setAnalystNotes("");
    setCreatingIndicator(false);
    setSessionIndicators([]);
  }

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
    resetForm();
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
            {creatingIndicator ? (
              <IndicatorQuickCreate
                onCreated={(id, name) => {
                  setSessionIndicators((prev) => [...prev, { id, name }]);
                  setIndicatorId(id);
                  setCreatingIndicator(false);
                  void utils.horizon.signals.listIndicators.invalidate();
                }}
                onCancel={() => setCreatingIndicator(false)}
              />
            ) : (
              <Select
                value={indicatorId}
                onValueChange={(val) => {
                  if (val === CREATE_NEW_INDICATOR) {
                    setCreatingIndicator(true);
                    return;
                  }
                  setIndicatorId(val);
                }}
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
                  <SelectItem value={CREATE_NEW_INDICATOR}>+ Create new indicator…</SelectItem>
                </SelectContent>
              </Select>
            )}
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

// ---- Main screen ----

export default function HorizonSnippetsScreen() {
  const [addOpen, setAddOpen] = useState(false);
  const utils = trpc.useUtils();

  const snippetsQuery = trpc.horizon.snippets.list.useQuery();
  const snippets: Snippet[] = (snippetsQuery.data ?? []) as Snippet[];

  // Group by indicator: linked → sorted by indicator name; unlinked at end
  const groups: { indicatorName: string | null; indicatorId: string | null; items: Snippet[] }[] = [];
  const byIndicator = new Map<string | null, Snippet[]>();

  for (const s of snippets) {
    const key = s.indicatorId ?? null;
    if (!byIndicator.has(key)) byIndicator.set(key, []);
    byIndicator.get(key)!.push(s);
  }

  // linked groups sorted by name
  const linked = [...byIndicator.entries()]
    .filter(([k]) => k !== null)
    .sort(([, a], [, b]) => (a[0].indicatorName ?? "").localeCompare(b[0].indicatorName ?? ""));

  for (const [key, items] of linked) {
    groups.push({ indicatorId: key, indicatorName: items[0].indicatorName, items });
  }

  // unlinked bucket at end
  if (byIndicator.has(null)) {
    groups.push({ indicatorId: null, indicatorName: null, items: byIndicator.get(null)! });
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
            <span>Information Snippets</span>
          </div>
          <div className="mt-2 text-3xl font-semibold">Information Snippets</div>
          <div className="mt-2 text-sm text-muted-foreground">
            Captured quotes and analyst notes, grouped by indicator.
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
            <div className="text-sm font-medium">No snippets captured yet.</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Capture snippets from articles in{" "}
              <Link href="/horizon/gdelt/triage" className="underline hover:text-foreground">
                GDELT Triage
              </Link>
              , or add one manually.
            </div>
            <Button size="sm" className="mt-4" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Snippet
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.indicatorId ?? "__unlinked__"}>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {group.indicatorName ?? "Unlinked"}
                </h2>
                <div className="space-y-3">
                  {group.items.map((s) => (
                    <SnippetCard
                      key={s.id}
                      snippet={s}
                      onDeleted={() => void utils.horizon.snippets.list.invalidate()}
                    />
                  ))}
                </div>
              </section>
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
