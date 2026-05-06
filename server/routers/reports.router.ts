import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { scenarios, scenarioIndicatorMap, signalEvents } from "@shared/db";

const ScenarioReportRowSchema = z.object({
  scenarioId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  indicatorCount: z.number().int(),
  eventCount: z.number().int(),
});

export const reportsRouter = router({
  getThemeBrief: protectedProcedure
    .input(z.object({ themeId: z.string().uuid().optional() }))
    .output(z.array(ScenarioReportRowSchema))
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      if (!input.themeId) return [];

      const rows = await db
        .select({
          scenarioId: scenarios.id,
          name: scenarios.name,
          description: scenarios.description,
          indicatorCount: sql<number>`COUNT(DISTINCT ${scenarioIndicatorMap.indicatorId})::int`,
          eventCount: sql<number>`COUNT(${signalEvents.id})::int`,
        })
        .from(scenarios)
        .leftJoin(scenarioIndicatorMap, eq(scenarioIndicatorMap.scenarioId, scenarios.id))
        .leftJoin(signalEvents, eq(signalEvents.indicatorId, scenarioIndicatorMap.indicatorId))
        .where(and(eq(scenarios.themeId, input.themeId), eq(scenarios.analystGroupId, groupId)))
        .groupBy(scenarios.id, scenarios.name, scenarios.description)
        .orderBy(scenarios.updatedAt);

      return rows;
    }),
});
