import {z} from "zod"

export const snippetFormSchema = z.object({
  content: z.string().min(1, "Snippet content is required"),
  tags: z.array(z.string()).default([]),
  themeId: z.string().uuid().nullable(),
});

export type SnippetFormValues = z.infer<typeof snippetFormSchema>;

export const editSnippetSchema = z.object({
  content: z.string().min(1, "Snippet content is required"),
  tags: z.array(z.string()).default([]),
  themeId: z.string().uuid().nullable().optional(),
});
export type EditSnippetValues = z.infer<typeof editSnippetSchema>;

