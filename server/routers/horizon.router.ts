import { z } from "zod";
import { eq, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { scenarios, themes, scenarioIndicatorMap, indicators, signalEvents } from "@shared/db";
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
        .leftJoin(themes, eq(themes.id, scenarios.themeId))
        .where(whereClause)
        .orderBy(desc(scenarios.updatedAt));

      return { themes: themeRows, scenarios: scenarioRows };
    }),

  getScenarioWarmth: protectedProcedure
    .output(
      z.array(
        z.object({
          scenarioId: z.string().uuid(),
          scenarioName: z.string(),
          delta: z.number(),
        })
      )
    )
    .query(async ({ ctx }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      // Sum strength × recency_weight for approved events in last 30 days (recent)
      // vs. flat strength sum for approved events in the 30–60 day window (prev).
      // delta = recent − prev: positive → warmer, negative → colder.
      const rows = await db
        .select({
          scenarioId: scenarios.id,
          scenarioName: scenarios.name,
          recentWarmth: sql<number>`COALESCE(SUM(
            CASE WHEN ${signalEvents.createdAt} >= NOW() - INTERVAL '30 days'
            THEN ${indicators.strength}::float * (
              EXTRACT(EPOCH FROM (${signalEvents.createdAt} - (NOW() - INTERVAL '30 days')))
              / (30.0 * 86400)
            )
            ELSE 0 END
          ), 0)`.as("recent_warmth"),
          prevWarmth: sql<number>`COALESCE(SUM(
            CASE WHEN ${signalEvents.createdAt} < NOW() - INTERVAL '30 days'
            THEN ${indicators.strength}::float
            ELSE 0 END
          ), 0)`.as("prev_warmth"),
        })
        .from(scenarios)
        .leftJoin(scenarioIndicatorMap, eq(scenarioIndicatorMap.scenarioId, scenarios.id))
        .leftJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
        .leftJoin(
          signalEvents,
          sql`${signalEvents.indicatorId} = ${indicators.id}
              AND ${signalEvents.status} = 'approved'
              AND ${signalEvents.createdAt} >= NOW() - INTERVAL '60 days'`
        )
        .where(eq(scenarios.analystGroupId, groupId))
        .groupBy(scenarios.id, scenarios.name);

      return rows.map((r) => ({
        scenarioId: r.scenarioId,
        scenarioName: r.scenarioName,
        delta: Number(r.recentWarmth) - Number(r.prevWarmth),
      }));
    }),
});
