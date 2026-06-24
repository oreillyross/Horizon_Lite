import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatRelativeTime } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, Plus } from "lucide-react";

function WarmthBadge({ delta }: { delta: number }) {
  if (delta > 0) return <span className="font-semibold text-emerald-600">▲</span>;
  if (delta < 0) return <span className="font-semibold text-rose-500">▼</span>;
  return <span className="text-muted-foreground">—</span>;
}

function SkeletonRow() {
  return (
    <tr className="border-t">
      <td className="px-4 py-3">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-64 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-6 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </td>
      <td className="px-4 py-3" />
    </tr>
  );
}


export default function HorizonScenariosListScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.horizon.scenarios.list.useQuery({});
  const warmthQuery = trpc.horizon.dashboard.getScenarioWarmth.useQuery();

  const deleteMutation = trpc.horizon.scenarios.delete.useMutation({
    onSuccess: () => {
      utils.horizon.scenarios.list.invalidate();
      setDeleteTargetId(null);
      toast({ title: "Scenario deleted" });
    },
    onError: (err) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const rows = listQuery.data ?? [];
  const deleteTarget = rows.find((r) => r.id === deleteTargetId);

  const warmthMap = new Map(
    (warmthQuery.data ?? []).map((w) => [w.scenarioId, w.delta])
  );

  // Group rows by theme name; null/undefined theme → "Unassigned" at the end
  const themeGroups: { themeName: string; scenarios: typeof rows }[] = [];
  if (rows.length > 0) {
    const byTheme = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = row.themeName ?? "__unassigned__";
      if (!byTheme.has(key)) byTheme.set(key, []);
      byTheme.get(key)!.push(row);
    }
    for (const [key, items] of byTheme) {
      if (key !== "__unassigned__") {
        themeGroups.push({ themeName: key, scenarios: items });
      }
    }
    themeGroups.sort((a, b) => a.themeName.localeCompare(b.themeName));
    if (byTheme.has("__unassigned__")) {
      themeGroups.push({ themeName: "Unassigned", scenarios: byTheme.get("__unassigned__")! });
    }
  }

  const tableHeaders = (
    <thead className="bg-muted/40">
      <tr>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-48">Name</th>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-24">Indicators</th>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-16">Warmth</th>
        <th className="px-4 py-3 text-left font-medium text-muted-foreground w-28">Updated</th>
        <th className="px-4 py-3 w-10" />
      </tr>
    </thead>
  );

  function renderScenarioRow(scenario: (typeof rows)[number]) {
    return (
      <tr
        key={scenario.id}
        className="border-t hover:bg-muted/20 cursor-pointer"
        onClick={() => setLocation(`/horizon/scenarios/${scenario.id}`)}
      >
        <td className="px-4 py-3 font-medium">{scenario.name}</td>
        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
          {scenario.description}
        </td>
        <td className="px-4 py-3 text-center">
          {scenario.indicatorCount > 0 ? (
            <Link
              href={`/horizon/scenarios/${scenario.id}`}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="text-primary hover:underline tabular-nums font-medium"
            >
              {scenario.indicatorCount}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-center">
          <WarmthBadge delta={warmthMap.get(scenario.id) ?? 0} />
        </td>
        <td className="px-4 py-3 text-muted-foreground tabular-nums">
          {formatRelativeTime(scenario.updatedAt)}
        </td>
        <td
          className="px-4 py-3"
          onClick={(e) => e.stopPropagation()}
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => setLocation(`/horizon/scenarios/${scenario.id}`)}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteTargetId(scenario.id)}
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Scenarios</h1>
        <Link href="/horizon/scenarios/new">
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Scenario
          </Button>
        </Link>
      </div>

      {/* Table(s) */}
      <div className="mt-6 space-y-6">
        {listQuery.isLoading ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              {tableHeaders}
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
              </tbody>
            </table>
          </div>
        ) : rows.length === 0 ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              {tableHeaders}
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="text-sm font-medium text-muted-foreground">
                      No scenarios yet. Create your first threat narrative.
                    </div>
                    <Link href="/horizon/scenarios/new">
                      <Button variant="outline" size="sm" className="mt-4">
                        New Scenario
                      </Button>
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          themeGroups.map((group) => (
            <div key={group.themeName} className="overflow-x-auto rounded-md border">
              <div className="bg-muted/60 px-4 py-2 border-b">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.themeName}
                </span>
              </div>
              <table className="w-full text-sm">
                {tableHeaders}
                <tbody>
                  {group.scenarios.map(renderScenarioRow)}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTargetId} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete scenario?</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  <span className="font-medium">{deleteTarget.name}</span> will be permanently
                  deleted. This cannot be undone.
                </>
              ) : (
                "This scenario will be permanently deleted. This cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTargetId && deleteMutation.mutate({ id: deleteTargetId })}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
