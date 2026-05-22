import { z } from "zod";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { scenarios, scenarioIndicatorMap, indicators, signalEvents } from "@shared/db";

const ScenarioReportRowSchema = z.object({
  scenarioId: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  indicatorCount: z.number().int(),
  eventCount: z.number().int(),
});

const AssessmentEventSchema = z.object({
  eventId: z.string().uuid(),
  title: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  score: z.number(),
  createdAt: z.date(),
});

const AssessmentIndicatorSchema = z.object({
  indicatorId: z.string().uuid(),
  indicatorName: z.string(),
  strength: z.number().int(),
  timeWeight: z.string(),
  events: z.array(AssessmentEventSchema),
});

const AssessmentScenarioSchema = z.object({
  scenarioId: z.string().uuid(),
  scenarioName: z.string(),
  scenarioDescription: z.string(),
  delta: z.number(),
  indicators: z.array(AssessmentIndicatorSchema),
});

const WINDOW_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };

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

  generateAssessment: protectedProcedure
    .input(
      z.object({
        themeId: z.string().uuid(),
        window: z.enum(["7d", "30d", "90d"]),
      })
    )
    .output(z.array(AssessmentScenarioSchema))
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      const windowDays = WINDOW_DAYS[input.window];

      // Warmth delta: sum of strength × recency_weight for approved events in the window.
      // recency_weight = fraction of window elapsed since event (0 at window start, 1 at now).
      const scenarioRows = await db
        .select({
          scenarioId: scenarios.id,
          scenarioName: scenarios.name,
          scenarioDescription: scenarios.description,
          delta: sql<number>`COALESCE(SUM(
            ${indicators.strength}::float *
            EXTRACT(EPOCH FROM (${signalEvents.createdAt} - (NOW() - INTERVAL '1 day' * ${windowDays})))
            / (${windowDays} * 86400.0)
          ), 0)`.as("delta"),
        })
        .from(scenarios)
        .leftJoin(scenarioIndicatorMap, eq(scenarioIndicatorMap.scenarioId, scenarios.id))
        .leftJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
        .leftJoin(
          signalEvents,
          sql`${signalEvents.indicatorId} = ${indicators.id}
              AND ${signalEvents.status} = 'approved'
              AND ${signalEvents.createdAt} >= NOW() - INTERVAL '1 day' * ${windowDays}`
        )
        .where(and(eq(scenarios.themeId, input.themeId), eq(scenarios.analystGroupId, groupId)))
        .groupBy(scenarios.id, scenarios.name, scenarios.description)
        .orderBy(desc(sql`delta`));

      if (scenarioRows.length === 0) return [];

      const scenarioIds = scenarioRows.map((r) => r.scenarioId);

      // Flat rows: scenario → indicator → event (nulls where no approved events in window)
      const evidenceRows = await db
        .select({
          scenarioId: scenarioIndicatorMap.scenarioId,
          indicatorId: indicators.id,
          indicatorName: indicators.name,
          strength: indicators.strength,
          timeWeight: indicators.timeWeight,
          eventId: signalEvents.id,
          eventTitle: signalEvents.title,
          eventSourceUrl: signalEvents.sourceUrl,
          eventScore: signalEvents.score,
          eventCreatedAt: signalEvents.createdAt,
        })
        .from(scenarioIndicatorMap)
        .innerJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
        .leftJoin(
          signalEvents,
          sql`${signalEvents.indicatorId} = ${indicators.id}
              AND ${signalEvents.status} = 'approved'
              AND ${signalEvents.createdAt} >= NOW() - INTERVAL '1 day' * ${windowDays}`
        )
        .where(inArray(scenarioIndicatorMap.scenarioId, scenarioIds))
        .orderBy(desc(indicators.strength));

      // Group evidence into nested structure
      type IndicatorEntry = {
        indicatorId: string;
        indicatorName: string;
        strength: number;
        timeWeight: string;
        events: { eventId: string; title: string | null; sourceUrl: string | null; score: number; createdAt: Date }[];
      };

      const evidenceMap = new Map<string, Map<string, IndicatorEntry>>();

      for (const row of evidenceRows) {
        if (!evidenceMap.has(row.scenarioId)) {
          evidenceMap.set(row.scenarioId, new Map());
        }
        const indMap = evidenceMap.get(row.scenarioId)!;

        if (!indMap.has(row.indicatorId)) {
          indMap.set(row.indicatorId, {
            indicatorId: row.indicatorId,
            indicatorName: row.indicatorName,
            strength: row.strength,
            timeWeight: row.timeWeight,
            events: [],
          });
        }

        if (row.eventId !== null) {
          indMap.get(row.indicatorId)!.events.push({
            eventId: row.eventId,
            title: row.eventTitle,
            sourceUrl: row.eventSourceUrl,
            score: row.eventScore,
            createdAt: row.eventCreatedAt!,
          });
        }
      }

      return scenarioRows.map((scenario) => ({
        scenarioId: scenario.scenarioId,
        scenarioName: scenario.scenarioName,
        scenarioDescription: scenario.scenarioDescription,
        delta: Number(scenario.delta),
        indicators: Array.from(evidenceMap.get(scenario.scenarioId)?.values() ?? []),
      }));
    }),
});
