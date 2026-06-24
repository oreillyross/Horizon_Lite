import { useParams } from "wouter";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, Scissors, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export default function HorizonSnippetDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? "";

  const query = trpc.horizon.snippets.getById.useQuery({ id }, { enabled: !!id });

  if (query.isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8">
        <div className="text-sm text-muted-foreground">
          <Link href="/horizon/snippets" className="hover:underline">
            ← Information Snippets
          </Link>
        </div>
        <div className="mt-8 rounded-lg border bg-background p-8 text-center">
          <Scissors className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
          <div className="text-lg font-medium">Snippet not found</div>
          <div className="mt-2 text-sm text-muted-foreground">
            This snippet may have been deleted.
          </div>
        </div>
      </div>
    );
  }

  const snippet = query.data;
  const displayDate = snippet.pubDate ?? snippet.createdAt;
  const isAiSuggested =
    !!snippet.aiSuggestedIndicatorId &&
    snippet.aiSuggestedIndicatorId === snippet.indicatorId;

  return (
    <div className="mx-auto max-w-3xl px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="text-sm text-muted-foreground">
        <Link href="/horizon/overview" className="hover:underline">
          Horizon
        </Link>
        <span className="mx-2">/</span>
        <Link href="/horizon/snippets" className="hover:underline">
          Information Snippets
        </Link>
        <span className="mx-2">/</span>
        <span>Detail</span>
      </div>

      {/* Card */}
      <div className="mt-6 rounded-lg border bg-background p-6 shadow-sm space-y-5">
        <blockquote className="text-base leading-relaxed text-foreground border-l-4 border-primary/40 pl-4">
          {snippet.quote ?? snippet.content}
        </blockquote>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          {isAiSuggested && (
            <Badge
              variant="outline"
              className="gap-1 border-violet-300 text-violet-600 dark:border-violet-700 dark:text-violet-400"
            >
              <Sparkles className="h-3 w-3" />
              AI suggestion
            </Badge>
          )}
          {snippet.indicatorName && (
            <span>
              Indicator:{" "}
              <span className="font-medium text-foreground">{snippet.indicatorName}</span>
            </span>
          )}
          {snippet.sourceUrl && (
            <span>
              Source:{" "}
              <a
                href={snippet.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:underline"
              >
                {snippet.sourceUrl}
              </a>
            </span>
          )}
          <span className="ml-auto tabular-nums">{formatDate(displayDate)}</span>
        </div>

        {snippet.analystNotes && (
          <div className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground italic">
            {snippet.analystNotes}
          </div>
        )}
      </div>
    </div>
  );
}
