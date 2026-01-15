import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Code2, Plus, X, Hash, Send } from "lucide-react";
const snippetFormSchema = z.object({
  content: z.string().min(1, "Snippet content is required"),
  tags: z.array(z.string()).default([]),
});
type SnippetFormValues = z.infer<typeof snippetFormSchema>;
export default function SnippetForm() {
  const { toast } = useToast();
  const [tagInput, setTagInput] = useState("");
  const form = useForm<SnippetFormValues>({
    resolver: zodResolver(snippetFormSchema),
    defaultValues: {
      content: "",
      tags: [],
    },
  });
  const tags = form.watch("tags");
  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim().replace(/^#/, "");
    if (trimmedTag && !tags.includes(trimmedTag)) {
      form.setValue("tags", [...tags, trimmedTag]);
      setTagInput("");
    }
  }, [tagInput, tags, form]);
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };
  const handleRemoveTag = (tagToRemove: string) => {
    form.setValue(
      "tags",
      tags.filter((tag) => tag !== tagToRemove)
    );
  };
  const onSubmit = async (data: SnippetFormValues) => {
    console.log("Snippet data ready for API:", data);
    toast({
      title: "Snippet Ready",
      description: `Content: ${data.content.substring(0, 50)}... with ${data.tags.length} tags`,
    });
  };
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Create Information Snippet
            </CardTitle>
            <CardDescription>
              Add an information receipt along with associated tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Snippet</FormLabel>
                      <FormControl>
                        <Textarea
                          data-testid="textarea-snippet-content"
                          placeholder="Paste your information snippet here..."
                          className="min-h-[300px] font-mono text-sm resize-y"
                          style={{
                            whiteSpace: "pre",
                            overflowX: "auto",
                          }}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Multi-column code area - supports horizontal scrolling for long lines
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4">
                  <FormLabel>Tags</FormLabel>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        data-testid="input-tag"
                        placeholder="Type a tag name (e.g., #javascript)"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        className="pl-9"
                      />
                    </div>
                    <Button
                      type="button"
                      data-testid="button-add-tag"
                      onClick={handleAddTag}
                      disabled={!tagInput.trim().replace(/^#/, "")}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tag
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-4 rounded-md bg-muted/50">
                      {tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          data-testid={`badge-tag-${tag}`}
                          className="gap-1 pr-1"
                        >
                          <Hash className="h-3 w-3" />
                          {tag}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            data-testid={`button-remove-tag-${tag}`}
                            className="h-4 w-4 ml-1 rounded-full"
                            onClick={() => handleRemoveTag(tag)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  {tags.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No tags added yet. Type # followed by a tag name above.
                    </p>
                  )}
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <Button
                    type="submit"
                    data-testid="button-submit-snippet"
                    disabled={!form.formState.isValid}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Save Snippet
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}