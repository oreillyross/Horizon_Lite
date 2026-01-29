import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Plus, X, Hash, Send } from "lucide-react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const editSnippetSchema = z.object({
  content: z.string().min(1, "Snippet content is required"),
  tags: z.array(z.string()).default([]),
});
type EditSnippetValues = z.infer<typeof editSnippetSchema>;

export default function EditSnippetScreen() {
  const utils = trpc.useUtils();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const snippetsQuery = trpc.getSnippets.useQuery();
  const snippet = useMemo(
    () => snippetsQuery.data?.find((s) => s.id === id),
    [snippetsQuery.data, id]
  );

  const updateSnippetMutation = trpc.updateSnippet.useMutation({
    onSuccess: (updated) => {
      utils.getSnippets.setData(undefined, (old) =>
        old?.map((s) => (s.id === updated.id ? updated : s))
      );
      setLocation("/snippet/show");
    },
  });

  const form = useForm<EditSnippetValues>({
    resolver: zodResolver(editSnippetSchema),
    defaultValues: { content: "", tags: [] },
    mode: "onChange",
  });

  const tags = form.watch("tags");
  const [tagInput, setTagInput] = useState("");

  // populate form once snippet is available
  useEffect(() => {
    if (snippet) {
      form.reset({
        content: snippet.content ?? "",
        tags: Array.isArray(snippet.tags) ? snippet.tags : [],
      });
      setTagInput("");
    }
  }, [snippet, form]);

  const handleAddTag = useCallback(() => {
    const trimmed = tagInput.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    form.setValue("tags", [...tags, trimmed], { shouldDirty: true, shouldValidate: true });
    setTagInput("");
  }, [tagInput, tags, form]);

  const handleRemoveTag = useCallback(
    (tagToRemove: string) => {
      form.setValue(
        "tags",
        tags.filter((t) => t !== tagToRemove),
        { shouldDirty: true, shouldValidate: true }
      );
    },
    [tags, form]
  );

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const onSubmit = (data: EditSnippetValues) => {
    if (!snippet) return;

    updateSnippetMutation.mutate({
      id: snippet.id,
      content: data.content,
      tags: data.tags,
    });
  };

  if (snippetsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 aria-label="Loading" className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!snippet) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-sm text-muted-foreground mb-4">Snippet not found.</p>
        <button className="underline text-sm" onClick={() => setLocation("/snippet/show")}>
          ← Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold">Edit Snippet</h1>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label htmlFor="snippet-content" className="block text-sm font-medium mb-1">
            Content
          </label>
          <Textarea
            id="snippet-content"
            className="min-h-[300px] font-mono text-sm resize-y whitespace-pre-wrap break-words"
            value={form.watch("content")}
            {...form.register("content")}
            onChange={(e) =>
              form.setValue("content", e.target.value, { shouldDirty: true, shouldValidate: true })
            }
            
          />
          {/* Optional inline error */}
          {form.formState.errors.content?.message && (
            <p className="text-sm text-red-600 mt-1">{form.formState.errors.content.message}</p>
          )}
        </div>

        <div className="space-y-3">
          <label htmlFor="snippet-tags" className="block text-sm font-medium">Tags</label>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="snippet-tags"
                placeholder="Type a tag name (e.g., #Alliance)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                className="pl-9"
              />
            </div>

            <Button
              type="button"
              onClick={handleAddTag}
              disabled={!tagInput.trim().replace(/^#/, "")}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tag
            </Button>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 p-4 rounded-md bg-muted/50">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  <Hash className="h-3 w-3" />
                  {tag}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 rounded-full"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No tags added yet. Type # followed by a tag name above.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={updateSnippetMutation.isPending || !form.formState.isValid}>
            <Send className="h-4 w-4 mr-2" />
            Save
          </Button>

          <Button type="button" variant="outline" onClick={() => setLocation("/snippet/show")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
