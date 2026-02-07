import { Link, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2, ArrowLeft, Pencil } from "lucide-react";

function formatDate(d: string | Date) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString();
}

export default function SnippetViewScreen() {
  const [, params] = useRoute("/snippet/:id");
  const id = params?.id ?? "";

  const { data, isLoading, isError } = trpc.snippets.getSnippetById.useQuery(
    { id },
    { enabled: !!id }
  );

  if (isLoading) {
    return (
      <div className="px-6 lg:px-8 py-6 max-w-4xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading snippet…
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="px-6 lg:px-8 py-6 max-w-4xl">
        <div className="text-sm text-destructive">Snippet not found.</div>
        <div className="mt-4">
          <Link href="/" className="text-sm underline">
            Go back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>

          <div className="text-sm text-muted-foreground">
            Created {formatDate(data.createdAt)}
            {/* {data.updatedAt ? ` · Updated ${formatDate(data.updatedAt)}` : null} */}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/snippets/${data.id}/edit`}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="rounded-xl border bg-background p-6">
        <pre className="whitespace-pre-wrap break-words text-sm font-mono leading-6">
          {data.content}
        </pre>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {(data.tags ?? []).map((t: string) => (
          <Link
            key={t}
            href={`/?tag=${encodeURIComponent(t)}`}
            className="rounded-md border px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            #{t}
          </Link>
        ))}
      </div>

      {/* Future section placeholder */}
      <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
        Future: link previews, embeds, attachments, related snippets…
      </div>
    </div>
  );
}
