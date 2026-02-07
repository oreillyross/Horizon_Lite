import { publicProcedure, router } from "../trpc";
import { themeStorage } from "../storage";

import {
  themeIdSchema,
  createThemeInputSchema,
  updateThemeInputSchema,
  setSnippetThemeInputSchema,
} from "@shared";

export const themesRouter = router({
  getThemes: publicProcedure.query(async () => {
    return await themeStorage.getThemes();
  }),

  getThemeById: publicProcedure
    .input(themeIdSchema)
    .query(async ({ input }) => {
      return await themeStorage.getThemeById(input.id);
    }),

  createTheme: publicProcedure
  .input(createThemeInputSchema)
  .mutation(async ({ input }) => {
    // Ensure this returns { id: string }
    return await themeStorage.createTheme(input);
  }),

  updateTheme: publicProcedure
    .input(updateThemeInputSchema)
    .mutation(async ({ input }) => {
      return await themeStorage.updateTheme(input);
    }),

  deleteTheme: publicProcedure
    .input(themeIdSchema)
    .mutation(async ({ input }) => {
      return await themeStorage.deleteTheme(input.id);
    }),

  setSnippetTheme: publicProcedure
    .input(setSnippetThemeInputSchema)
    .mutation(async ({ input }) => {
      await themeStorage.setSnippetTheme(input);
      return { ok: true };
    }),
});
