import { z } from "zod";

export const ThemeSynopsisSchema = z.object({
  synopsis: z.string().min(1),
  keyPoints: z
    .array(
      z.object({
        text: z.string().min(1),
        citeSnippetIds: z.array(z.string().min(1)).default([]),
      }),
    )
    .default([]),
  openQuestions: z
    .array(
      z.object({
        text: z.string().min(1),
        citeSnippetIds: z.array(z.string().min(1)).default([]),
      }),
    )
    .default([]),
  timeline: z
    .array(
      z.object({
        when: z.string().min(1),
        what: z.string().min(1),
        citeSnippetIds: z.array(z.string().min(1)).default([]),
      }),
    )
    .optional(),
});

export type ThemeSynopsis = z.infer<typeof ThemeSynopsisSchema>;
