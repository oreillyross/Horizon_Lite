import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, Trash2 } from "lucide-react";
import { formatDateTime } from "@/lib/formatters";
import { useToast } from "@/hooks/use-toast";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

export default function ThemesScreen() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = trpc.themes.getThemes.useQuery();

  const deleteMutation = trpc.themes.deleteTheme.useMutation({
    onSuccess: () => {
      utils.themes.getThemes.invalidate();
      toast({ title: "Theme deleted" });
      setPendingDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
      setPendingDeleteId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="px-6 lg:px-8 py-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading themes…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-6 lg:px-8 py-6 text-sm text-red-600">
        Failed to load themes: {error?.message}
      </div>
    );
  }

  const themes = data ?? [];

  return (
    <div className="px-6 lg:px-8 py-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Themes</h1>
        <Button variant="outline" size="sm" onClick={() => setLocation("/theme/create")}>
          Create theme
        </Button>
      </div>

      <div className="mt-6 overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Snippets</th>
              <th className="px-4 py-3 font-medium">Synopsis updated</th>
              <th className="px-4 py-3 font-medium">Version</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {themes.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={5}>
                  No themes yet.
                </td>
              </tr>
            ) : (
              themes.map((t) => (
                <tr key={t.id} className="border-t hover:bg-muted/20 group">
                  <td className="px-4 py-3">
                    <button
                      className="font-medium underline text-left"
                      onClick={() => setLocation(`/theme/${t.id}`)}
                    >
                      {t.name}
                    </button>
                    {t.description ? (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {t.description}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{t.snippetCount}</td>
                  <td className="px-4 py-3">{formatDateTime(t.synopsisUpdatedAt)}</td>
                  <td className="px-4 py-3 tabular-nums">{t.synopsisVersion ?? 0}</td>
                  <td className="px-2 py-3 text-right">
                    <button
                      className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground/40 group-hover:text-muted-foreground hover:text-destructive transition-colors"
                      onClick={() => setPendingDeleteId(t.id)}
                      aria-label={`Delete theme ${t.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AlertDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete theme?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the theme and all linked scenarios,
              indicators, events, and links. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              onClick={() => pendingDeleteId && deleteMutation.mutate({ id: pendingDeleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
