import { trpc } from "@/lib/trpc";
import { Loader2, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";

export default function SnippetShow() {
  const snippetQuery = trpc.getSnippets.useQuery();

  return (
    <div>
      <CardContent>
        {snippetQuery.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : snippetQuery.data && snippetQuery.data.length > 0 ? (
          <div className="space-y-2">
            {snippetQuery.data.map((snippet) => (
              <div
                key={snippet.id}
                data-testid={`row-snippet-${snippet.id}`}
                className="flex items-center justify-between p-4 rounded-md bg-muted/50 hover:bg-muted"
              >
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-mono">📄</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{snippet.content.slice(0, 100)}...</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {snippet.tags?.join(", ") || "no tags"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    ID: {snippet.id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  data-testid={`button-delete-${snippet.id}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No snippets yet</p>
            <p className="text-sm">Create your first snippet above</p>
          </div>
        )}
      </CardContent>
    </div>
  );
}
