import { z } from "zod";
import { publicProcedure, router } from "../trpc"; 
import { themeStorage } from "../storage"; 

export const themesRouter = router({
  getThemes: publicProcedure.query(async () => {
    return await themeStorage.getThemes();
  }),

  getThemeById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return await themeStorage.getThemeById(input.id);
    }),

  createTheme: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await themeStorage.createTheme(input);
    }),

  updateTheme: publicProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(80).optional(),
        description: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await themeStorage.updateTheme(input);
    }),

  deleteTheme: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      return await themeStorage.deleteTheme(input.id);
    }),

  setSnippetTheme: publicProcedure
    .input(
      z.object({
        snippetId: z.string().uuid(),
        themeId: z.string().uuid().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      await themeStorage.setSnippetTheme(input);
      return { ok: true };
    }),
});
