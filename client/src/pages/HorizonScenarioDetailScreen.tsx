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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
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

  const utils = trpc.useUtils();

  const query = trpc.horizon.scenarios.getById.useQuery({ id }, { enabled: !!id });

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

      {/* Indicators stub */}
      <div className="mt-6 rounded-lg border bg-background p-6 shadow-sm">
        <div className="text-sm font-medium">Indicators</div>
        <div className="mt-2 text-sm text-muted-foreground">
          0 indicators linked — indicator linking coming in the next slice.
        </div>
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
