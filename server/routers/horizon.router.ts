import { z } from "zod";
import { eq, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { scenarios, themes } from "@shared/db";
import { OverviewDTOSchema } from "../../shared";

export const dashboardRouter = router({
  getOverview: protectedProcedure
    .input(z.object({ themeId: z.string().uuid().optional() }).optional())
    .output(OverviewDTOSchema)
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      const themeRows = await db
        .select({
          id: themes.id,
          name: themes.name,
          scenarioCount: sql<number>`cast(count(${scenarios.id}) as int)`.as("scenario_count"),
        })
        .from(themes)
        .leftJoin(scenarios, and(eq(scenarios.themeId, themes.id), eq(scenarios.analystGroupId, groupId)))
        .groupBy(themes.id, themes.name)
        .orderBy(desc(themes.updatedAt), themes.name);

      const whereClause = input?.themeId
        ? and(eq(scenarios.analystGroupId, groupId), eq(scenarios.themeId, input.themeId))
        : eq(scenarios.analystGroupId, groupId);

      const scenarioRows = await db
        .select({
          id: scenarios.id,
          themeId: scenarios.themeId,
          themeName: themes.name,
          name: scenarios.name,
          description: scenarios.description,
        })
        .from(scenarios)
        .innerJoin(themes, eq(themes.id, scenarios.themeId))
        .where(whereClause)
        .orderBy(desc(scenarios.updatedAt));

      return { themes: themeRows, scenarios: scenarioRows };
    }),
});
