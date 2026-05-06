import { publicProcedure, protectedProcedure, router } from "../trpc";
import { themeStorage } from "../storage";
import { db } from "../db";
import { themes, scenarios } from "@shared/db";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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

  // Horizon-facing procedures — real Drizzle queries with scenario counts
  list: protectedProcedure.query(async () => {
    return db
      .select({
        id: themes.id,
        name: themes.name,
        description: themes.description,
        updatedAt: themes.updatedAt,
        scenarioCount: sql<number>`cast(count(${scenarios.id}) as int)`.as("scenario_count"),
      })
      .from(themes)
      .leftJoin(scenarios, eq(scenarios.themeId, themes.id))
      .groupBy(themes.id, themes.name, themes.description, themes.updatedAt)
      .orderBy(desc(themes.updatedAt), themes.name);
  }),

  getById: protectedProcedure.input(themeIdSchema).query(async ({ input }) => {
    const [row] = await db
      .select({
        id: themes.id,
        name: themes.name,
        description: themes.description,
        updatedAt: themes.updatedAt,
        scenarioCount: sql<number>`cast(count(${scenarios.id}) as int)`.as("scenario_count"),
      })
      .from(themes)
      .leftJoin(scenarios, eq(scenarios.themeId, themes.id))
      .where(eq(themes.id, input.id))
      .groupBy(themes.id, themes.name, themes.description, themes.updatedAt);

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Theme not found" });
    return row;
  }),
});
