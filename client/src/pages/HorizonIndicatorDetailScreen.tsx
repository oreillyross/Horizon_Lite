import React, { useState, useEffect } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Check, ExternalLink, Loader2, Pencil, Trash2, X } from "lucide-react";
import { createIndicatorInputSchema, type CreateIndicatorInput } from "@shared";
import { IndicatorPill } from "@/components/IndicatorPill";
import { formatDate, formatDateTime } from "@/lib/formatters";

function Skeleton({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />
  );
}

function SectionCard({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{title}</div>
        {right}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-md border bg-muted p-4">
      <div className="text-sm font-medium">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{body}</div>
    </div>
  );
}

function SuggestionsPanel({ indicatorId }: { indicatorId: string }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showDuplicates, setShowDuplicates] = useState(false);

  const q = trpc.horizon.signals.listSuggestions.useQuery(
    { indicatorId, showDuplicates },
    { enabled: Boolean(indicatorId) },
  );

  const approveMutation = trpc.horizon.signals.approveLink.useMutation({
    onSuccess: () => {
      utils.horizon.signals.listSuggestions.invalidate({ indicatorId });
    },
    onError: (err) => {
      toast({ title: "Approve failed", description: err.message, variant: "destructive" });
    },
  });

  const dismissMutation = trpc.horizon.signals.dismissLink.useMutation({
    onSuccess: () => {
      utils.horizon.signals.listSuggestions.invalidate({ indicatorId });
    },
    onError: (err) => {
      toast({ title: "Dismiss failed", description: err.message, variant: "destructive" });
    },
  });

  return (
    <SectionCard
      title="Signal suggestions"
      right={
        <div className="flex items-center gap-2">
          {q.data && q.data.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              {q.data.length} pending
            </span>
          )}
          <button
            onClick={() => setShowDuplicates((v) => !v)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              showDuplicates
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-border text-muted-foreground hover:bg-muted"
            }`}
          >
            {showDuplicates ? "Hide duplicates" : "Show duplicates"}
          </button>
        </div>
      }
    >
      {q.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : q.isError ? (
        <div className="text-sm text-destructive">{q.error.message}</div>
      ) : !q.data || q.data.length === 0 ? (
        <EmptyBox
          title="No pending suggestions"
          body="Approved and dismissed suggestions are removed from this queue. New suggestions appear here as ingestion runs."
        />
      ) : (
        <div className="divide-y">
          {q.data.map((event) => {
            const approveBusy =
              approveMutation.isPending &&
              approveMutation.variables?.signalEventId === event.id;
            const dismissBusy =
              dismissMutation.isPending &&
              dismissMutation.variables?.signalEventId === event.id;
            const isBusy = approveBusy || dismissBusy;

            return (
              <div key={event.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">
                      {event.title ?? (
                        <span className="italic text-muted-foreground">Untitled</span>
                      )}
                    </div>
                    {event.canonicalId && (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        duplicate
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {event.sourceHost && <span>{event.sourceHost}</span>}
                    <span className="font-mono tabular-nums">
                      score {event.score.toFixed(2)}
                    </span>
                    {event.confidenceScore !== null && event.confidenceScore !== undefined && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium tabular-nums ${
                          event.confidenceScore >= 0.66
                            ? "bg-emerald-100 text-emerald-800"
                            : event.confidenceScore >= 0.33
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        conf {event.confidenceScore.toFixed(2)}
                      </span>
                    )}
                    <span>{formatDate(event.createdAt)}</span>
                  </div>
                  {event.sourceUrl && (
                    <a
                      href={event.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-0.5 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {event.sourceHost ?? event.sourceUrl}
                    </a>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    disabled={isBusy}
                    onClick={() =>
                      approveMutation.mutate({ signalEventId: event.id })
                    }
                  >
                    {approveBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="mr-1 h-3.5 w-3.5" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-muted-foreground"
                    disabled={isBusy}
                    onClick={() =>
                      dismissMutation.mutate({ signalEventId: event.id })
                    }
                  >
                    {dismissBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="mr-1 h-3.5 w-3.5" />
                    )}
                    Dismiss
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

function EditForm({
  indicatorId,
  defaultValues,
  onCancel,
  onSaved,
}: {
  indicatorId: string;
  defaultValues: CreateIndicatorInput;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const form = useForm<CreateIndicatorInput>({
    resolver: zodResolver(createIndicatorInputSchema),
    defaultValues,
    mode: "onBlur",
  });

  const updateMutation = trpc.horizon.signals.updateIndicator.useMutation({
    onSuccess: () => {
      utils.horizon.signals.getIndicator.invalidate({ indicatorId });
      utils.horizon.signals.listIndicators.invalidate();
      toast({ title: "Indicator updated" });
      onSaved();
    },
    onError: (err) => {
      toast({
        title: "Update failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: CreateIndicatorInput) {
    updateMutation.mutate({
      id: indicatorId,
      data: {
        ...values,
        regionScope: values.regionScope?.trim() || undefined,
        description: values.description?.trim() || undefined,
      },
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Edit Indicator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-name"
              placeholder="e.g. State-media amplification of border incidents"
              maxLength={120}
              {...form.register("name")}
            />
            {form.formState.errors.name?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-category">
              Category <span className="text-destructive">*</span>
            </Label>
            <select
              id="edit-category"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              {...form.register("category")}
            >
              <option value="political">Political</option>
              <option value="infoops">InfoOps</option>
              <option value="infra">Infrastructure</option>
              <option value="diplomatic">Diplomatic</option>
            </select>
            {form.formState.errors.category?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.category.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="What observable event or pattern does this indicator track?"
              rows={4}
              maxLength={2000}
              className="resize-none"
              {...form.register("description")}
            />
            {form.formState.errors.description?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Region Scope */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-regionScope">Region Scope</Label>
            <Input
              id="edit-regionScope"
              placeholder="e.g. EU-wide, Baltic Sea, Western Balkans"
              maxLength={100}
              {...form.register("regionScope")}
            />
            {form.formState.errors.regionScope?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.regionScope.message}
              </p>
            )}
          </div>

          {/* Strength, TimeWeight, DecayBehaviour */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-strength">
                Strength <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-strength"
                type="number"
                min={1}
                max={9}
                {...form.register("strength", { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">1 (weak) – 9 (critical)</p>
              {form.formState.errors.strength?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.strength.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-timeWeight">
                Time Weight <span className="text-destructive">*</span>
              </Label>
              <select
                id="edit-timeWeight"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("timeWeight")}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
                <option value="year">Year</option>
              </select>
              {form.formState.errors.timeWeight?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.timeWeight.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-decayBehaviour">
                Decay <span className="text-destructive">*</span>
              </Label>
              <select
                id="edit-decayBehaviour"
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                {...form.register("decayBehaviour")}
              >
                <option value="linear">Linear</option>
                <option value="step">Step</option>
                <option value="none">None</option>
              </select>
              {form.formState.errors.decayBehaviour?.message && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.decayBehaviour.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

export default function HorizonIndicatorDetailScreen() {
  const params = useParams<{ id: string }>();
  const indicatorId = params?.id ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [editing, setEditing] = useState(false);

  const q = trpc.horizon.signals.getIndicator.useQuery(
    { indicatorId },
    { enabled: Boolean(indicatorId) },
  );

  const deleteMutation = trpc.horizon.signals.deleteIndicator.useMutation({
    onSuccess: () => {
      utils.horizon.signals.listIndicators.invalidate();
      toast({ title: "Indicator deleted" });
      setLocation("/horizon/signals");
    },
    onError: (err) => {
      toast({
        title: "Delete failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const d = q.data;

  const editDefaults: CreateIndicatorInput | null = d
    ? {
        name: d.indicator.name,
        category: d.indicator.category,
        description: d.indicator.description ?? "",
        regionScope: d.indicator.regionScope ?? "",
        strength: d.indicator.strength,
        timeWeight: d.indicator.timeWeight,
        decayBehaviour: d.indicator.decayBehaviour,
      }
    : null;

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-sm text-muted-foreground">
            <Link href="/horizon/overview" className="hover:underline">
              Horizon
            </Link>
            <span className="mx-2">/</span>
            <Link href="/horizon/signals" className="hover:underline">
              Signals
            </Link>
          </div>

          {q.isLoading ? (
            <>
              <Skeleton className="mt-3 h-8 w-[520px]" />
              <Skeleton className="mt-3 h-4 w-[420px]" />
            </>
          ) : d ? (
            <>
              <div className="mt-2 text-3xl font-semibold truncate">
                {d.indicator.name}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Category:{" "}
                <span className="font-medium text-foreground">
                  {d.indicator.category}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {q.isLoading ? (
            <>
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-10 w-40" />
            </>
          ) : d ? (
            <>
              <IndicatorPill tone={d.indicator.status as any}>{d.indicator.status}</IndicatorPill>

              <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
                <div className="text-xs text-muted-foreground">Acceleration</div>
                <div className="text-xl font-semibold font-mono tabular-nums">
                  {d.indicator.accelerationScore.toFixed(2)}
                </div>
              </div>

              <div className="rounded-lg border bg-background px-4 py-2 shadow-sm">
                <div className="text-xs text-muted-foreground">
                  Current / Baseline
                </div>
                <div className="text-xl font-semibold font-mono tabular-nums">
                  {d.indicator.currentValue.toFixed(1)} /{" "}
                  {d.indicator.baselineValue.toFixed(1)}
                </div>
              </div>

              {!editing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive border-destructive/40 hover:bg-destructive/10"
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete indicator?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete{" "}
                      <span className="font-medium">"{d.indicator.name}"</span>{" "}
                      and remove all its scenario mappings. This action cannot
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() =>
                        deleteMutation.mutate({ id: indicatorId })
                      }
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : null}
        </div>
      </div>

      {/* Error */}
      {q.isError ? (
        <div className="mt-6 rounded-lg border bg-background p-6 shadow-sm">
          <div className="text-sm font-medium">Unable to load indicator</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {q.error.message}
          </div>
          <button
            onClick={() => q.refetch()}
            className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Loader2 className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : null}

      {/* Edit form */}
      {editing && editDefaults && (
        <div className="mt-6">
          <EditForm
            indicatorId={indicatorId}
            defaultValues={editDefaults}
            onCancel={() => setEditing(false)}
            onSaved={() => setEditing(false)}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trend */}
        <div className="lg:col-span-2">
          <SectionCard title="Trend">
            {q.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : d?.trend?.length ? (
              <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                {d.trend.length} data point{d.trend.length !== 1 ? "s" : ""} recorded.
              </div>
            ) : (
              <EmptyBox
                title="No trend data"
                body="Once ingestion runs, trend points will appear here."
              />
            )}
          </SectionCard>
        </div>

        {/* Scenario impact */}
        <SectionCard title="Scenario impact">
          {q.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : d?.scenarioImpact?.length ? (
            <div className="space-y-2">
              {d.scenarioImpact
                .slice()
                .sort((a, b) => b.weight - a.weight)
                .map((s) => (
                  <a
                    key={s.scenarioId}
                    href={`/horizon/scenarios/${s.scenarioId}`}
                    className="block rounded-md border px-3 py-2 hover:bg-muted"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {s.scenarioName}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          weight:{" "}
                          <span className="font-mono tabular-nums">
                            {s.weight.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">→</div>
                    </div>
                  </a>
                ))}
            </div>
          ) : (
            <EmptyBox
              title="No scenario mappings"
              body="Map this indicator to scenarios to show strategic impact."
            />
          )}
        </SectionCard>
      </div>

      {/* Signal suggestions */}
      <div className="mt-6">
        <SuggestionsPanel indicatorId={indicatorId} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Trigger history */}
        <SectionCard title="Trigger history">
          {q.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : d?.triggerHistory?.length ? (
            <div className="space-y-2">
              {d.triggerHistory
                .slice()
                .sort((a, b) => b.at.localeCompare(a.at))
                .map((t, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="text-muted-foreground tabular-nums">
                      {formatDateTime(t.at)}
                    </div>
                    <div className="font-mono tabular-nums">
                      {t.value.toFixed(2)}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <EmptyBox
              title="No triggers recorded"
              body="Triggers appear once thresholds are crossed."
            />
          )}
        </SectionCard>

        {/* Linked evidence */}
        <div className="lg:col-span-2">
          <SectionCard title="Linked evidence">
            {q.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : d?.linkedEvidence?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 pr-4">Title</th>
                      <th className="py-2 pr-4">Source</th>
                      <th className="py-2 pr-4">Geo</th>
                      <th className="py-2 pr-4">Published</th>
                      <th className="py-2">Relevance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.linkedEvidence.map((e) => (
                      <tr key={e.id} className="border-b last:border-b-0">
                        <td className="py-3 pr-4">
                          {e.url ? (
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline"
                            >
                              {e.title}
                              <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                            </a>
                          ) : (
                            e.title
                          )}
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {e.summary}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {e.url ? (
                            <a
                              href={e.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3 shrink-0" />
                              {e.sourceHost}
                            </a>
                          ) : (
                            e.sourceHost
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">
                          {e.geo?.countryCode ?? e.geo?.regionLabel ?? "—"}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground tabular-nums">
                          {formatDateTime(e.publishedAt)}
                        </td>
                        <td className="py-3 font-mono tabular-nums">
                          {e.relevanceScore.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyBox
                title="No evidence linked"
                body="As ingestion runs, we'll surface and dedupe supporting evidence here."
              />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
