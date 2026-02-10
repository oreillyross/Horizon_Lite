import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export function RefreshSynopsisButton({ themeId }: { themeId: string }) {
  const utils = trpc.useUtils();

  const refresh = trpc.synopsis.refreshThemeSynopsis.useMutation({
    onSuccess: async () => {
      await utils.themes.getThemeById.invalidate({ id: themeId });
      await utils.snippets.getSnippets.invalidate();
    },
  });

  return (
    <Button
      variant="secondary"
      className="gap-2"
      onClick={() => refresh.mutate({ themeId })}
      disabled={refresh.isPending}
      title="Regenerate theme synopsis from the latest snippets"
    >
      {refresh.isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Refreshing…
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" />
          Refresh synopsis
        </>
      )}
    </Button>
  );
}
