import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export default function EditSnippetScreen() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const snippetsQuery = trpc.getSnippets.useQuery();
  const snippet = snippetsQuery.data?.find(s => s.id === id);

  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  // Populate form once snippet is available
  useEffect(() => {
    if (snippet) {
      setContent(snippet.content);
      setTags(snippet.tags.join(", "));
    }
  }, [snippet]);

  if (snippetsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!snippet) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground mb-4">
          Snippet not found.
        </p>
        <button
          className="underline text-sm"
          onClick={() => setLocation("/snippet/show")}
        >
          ← Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Edit Snippet</h1>

      <div>
        <label className="block text-sm font-medium mb-1">Content</label>
        <textarea
          className="w-full min-h-[160px] border rounded p-2"
          value={content}
          onChange={e => setContent(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tags</label>
        <input
          className="w-full border rounded p-2"
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="comma, separated, tags"
        />
      </div>

      <div className="flex gap-3">
        <button
          className="px-4 py-2 bg-black text-white rounded"
          type="submit"
        >
          Save
        </button>
        <button
          className="px-4 py-2 border rounded"
          type="button"
          onClick={() => setLocation("/snippet/show")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

