import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Trash2, Plus, X, Link2 } from "lucide-react";
import { updateScenarioInputSchema, type UpdateScenarioInput } from "@shared";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString();
}

export default function HorizonScenarioDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [indicatorSearch, setIndicatorSearch] = useState("");
  const [indicatorWeight, setIndicatorWeight] = useState("1.0");
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const utils = trpc.useUtils();

  const query = trpc.horizon.scenarios.getById.useQuery({ id }, { enabled: !!id });

  const linkedIndicatorsQuery = trpc.horizon.scenarios.getLinkedIndicators.useQuery(
    { id },
    { enabled: !!id },
  );

  const searchIndicatorsQuery = trpc.horizon.signals.searchIndicators.useQuery(
    { q: indicatorSearch, excludeScenarioId: id },
    { enabled: !!id && comboboxOpen },
  );

  const assignIndicatorMutation = trpc.horizon.scenarios.assignIndicator.useMutation({
    onSuccess: () => {
      linkedIndicatorsQuery.refetch();
      utils.horizon.signals.listIndicators.invalidate();
      setComboboxOpen(false);
      setIndicatorSearch("");
      setIndicatorWeight("1.0");
      toast({ title: "Indicator linked" });
    },
    onError: (err) => {
      toast({ title: "Failed to link indicator", description: err.message, variant: "destructive" });
    },
  });

  const removeIndicatorMutation = trpc.horizon.scenarios.removeIndicator.useMutation({
    onSuccess: () => {
      linkedIndicatorsQuery.refetch();
      utils.horizon.signals.listIndicators.invalidate();
      toast({ title: "Indicator unlinked" });
    },
    onError: (err) => {
      toast({ title: "Failed to unlink indicator", description: err.message, variant: "destructive" });
    },
  });

  function handleAssignIndicator(indicatorId: string) {
    const weight = parseFloat(indicatorWeight);
    if (isNaN(weight) || weight < 0.1 || weight > 10) {
      toast({ title: "Invalid weight", description: "Weight must be between 0.1 and 10", variant: "destructive" });
      return;
    }
    assignIndicatorMutation.mutate({ scenarioId: id, indicatorId, weight });
  }

  function handleRemoveIndicator(indicatorId: string) {
    removeIndicatorMutation.mutate({ scenarioId: id, indicatorId });
  }

  const form = useForm<UpdateScenarioInput>({
    resolver: zodResolver(updateScenarioInputSchema),
    mode: "onBlur",
  });

  function startEdit() {
    if (!query.data) return;
    form.reset({ id: query.data.id, name: query.data.name, description: query.data.description });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    form.reset();
  }

  const updateMutation = trpc.horizon.scenarios.update.useMutation({
    onSuccess: (updated) => {
      utils.horizon.scenarios.list.invalidate();
      utils.horizon.scenarios.getById.invalidate({ id: updated.id });
      setIsEditing(false);
      toast({ title: "Scenario saved" });
    },
    onError: (err) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.horizon.scenarios.delete.useMutation({
    onSuccess: () => {
      utils.horizon.scenarios.list.invalidate();
      toast({ title: "Scenario deleted" });
      setLocation("/horizon/scenarios");
    },
    onError: (err) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  function onSubmit(values: UpdateScenarioInput) {
    updateMutation.mutate(values);
  }

  // 404
  if (!query.isLoading && (query.isError || !query.data)) {
    return (
      <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
        <button
          type="button"
          onClick={() => setLocation("/horizon/scenarios")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Scenarios
        </button>
        <div className="mt-8 rounded-lg border bg-background p-8 text-center">
          <div className="text-lg font-medium">Scenario not found</div>
          <div className="mt-2 text-sm text-muted-foreground">
            This scenario may have been deleted or you don't have access.
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => setLocation("/horizon/scenarios")}
          >
            Back to Scenarios
          </Button>
        </div>
      </div>
    );
  }

  const scenario = query.data;

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => setLocation("/horizon/scenarios")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Scenarios
          </button>
          {query.isLoading ? (
            <Skeleton className="mt-2 h-8 w-72" />
          ) : (
            <h1 className="mt-2 text-3xl font-semibold truncate">{scenario?.name}</h1>
          )}
        </div>

        {!query.isLoading && scenario && !isEditing && (
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <Button variant="outline" size="sm" onClick={startEdit}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive h-8 w-8"
              onClick={() => setShowDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Timestamps */}
      {query.isLoading ? (
        <Skeleton className="mt-3 h-4 w-64" />
      ) : scenario ? (
        <div className="mt-3 text-xs text-muted-foreground">
          Created {fmtDate(scenario.createdAt)} · Updated {fmtDate(scenario.updatedAt)}
        </div>
      ) : null}

      {/* Body */}
      <div className="mt-6 rounded-lg border bg-background p-6 shadow-sm">
        {query.isLoading ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-28 w-full" />
            </div>
          </div>
        ) : isEditing ? (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                maxLength={100}
                {...form.register("name")}
              />
              {form.formState.errors.name?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                rows={6}
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

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        ) : scenario ? (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Name
              </div>
              <div className="text-sm font-medium">{scenario.name}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Description
              </div>
              <div className="text-sm whitespace-pre-wrap">{scenario.description}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Linked Indicators Panel */}
      <div className="mt-6 rounded-lg border bg-background p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Linked Indicators</span>
            {linkedIndicatorsQuery.data && (
              <Badge variant="secondary" className="ml-1">
                {linkedIndicatorsQuery.data.length}
              </Badge>
            )}
          </div>
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Plus className="h-3.5 w-3.5" />
                Link Indicator
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search indicators..."
                  value={indicatorSearch}
                  onValueChange={setIndicatorSearch}
                />
                <div className="px-3 py-2 border-b">
                  <Label htmlFor="link-weight" className="text-xs text-muted-foreground">
                    Weight (0.1–10)
                  </Label>
                  <Input
                    id="link-weight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={indicatorWeight}
                    onChange={(e) => setIndicatorWeight(e.target.value)}
                    className="mt-1 h-8"
                  />
                </div>
                <CommandList>
                  {searchIndicatorsQuery.isLoading ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </div>
                  ) : (
                    <>
                      <CommandEmpty>No indicators found.</CommandEmpty>
                      <CommandGroup>
                        {searchIndicatorsQuery.data?.map((indicator) => (
                          <CommandItem
                            key={indicator.id}
                            value={indicator.id}
                            onSelect={() => handleAssignIndicator(indicator.id)}
                            className="flex items-center justify-between"
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="truncate font-medium">{indicator.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">
                                {indicator.category}
                              </span>
                            </div>
                            <Badge variant="outline" className="ml-2 shrink-0">
                              {indicator.strength}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {linkedIndicatorsQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : linkedIndicatorsQuery.data?.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No indicators linked yet. Use the button above to link indicators to this scenario.
          </div>
        ) : (
          <div className="space-y-2">
            {linkedIndicatorsQuery.data?.map((link) => (
              <div
                key={link.indicatorId}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className="shrink-0">
                    {link.strength}
                  </Badge>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => setLocation(`/horizon/signals/${link.indicatorId}`)}
                      className="font-medium text-sm truncate hover:underline text-left"
                    >
                      {link.name}
                    </button>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="capitalize">{link.category}</span>
                      <span>·</span>
                      <span>{link.timeWeight}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    w: {link.weight.toFixed(1)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemoveIndicator(link.indicatorId)}
                    disabled={removeIndicatorMutation.isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete scenario?</DialogTitle>
            <DialogDescription>
              <span className="font-medium">{scenario?.name}</span> will be permanently deleted.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => id && deleteMutation.mutate({ id })}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
