import { publicProcedure, protectedProcedure, router } from "../trpc";
import { themeStorage } from "../storage";
import { db } from "../db";
import { themes, scenarios } from "@shared/db";
import { eq, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import {
  themeIdSchema,
  createThemeInputSchema,
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
      return await themeStorage.createTheme(input);
    }),

  // Horizon-facing procedure — scenario counts included
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
});
