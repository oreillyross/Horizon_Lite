import {z} from "zod"

export const ThemeCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(80, "Keep it under 80 chars"),
  description: z.string().max(280, "Keep it under 280 chars").optional().or(z.literal("")),
  // keep this flexible: you can later rename to `prompt`, `systemPrompt`, etc.
  prompt: z.string().max(8000, "Keep it under 8000 chars").optional().or(z.literal("")),
});

export type ThemeCreateValues = z.infer<typeof ThemeCreateSchema>;

export const themeIdSchema = z.object({
  id: z.string().uuid(),
});

export const createThemeInputSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(2000).nullable().optional(),
});

export const updateThemeInputSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(2000).nullable().optional(),
});

export const setSnippetThemeInputSchema = z.object({
  snippetId: z.string().uuid(),
  themeId: z.string().uuid().nullable(),
});

export type CreateThemeInput = z.infer<typeof createThemeInputSchema>;
export type UpdateThemeInput = z.infer<typeof updateThemeInputSchema>;
export type SetSnippetThemeInput = z.infer<typeof setSnippetThemeInputSchema>;
