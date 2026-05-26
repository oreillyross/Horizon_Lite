import { z } from "zod";
import { eq, and, sql, desc, inArray, notInArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { scenarios, scenarioIndicatorMap, indicators, signalEvents, themes } from "@shared/db";

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

  getResearchAgenda: protectedProcedure
    .input(z.object({ themeId: z.string().uuid() }))
    .output(
      z.array(
        z.object({
          indicatorId: z.string().uuid(),
          indicatorName: z.string(),
          strength: z.number().int(),
          totalWeight: z.number(),
          scenarios: z.array(
            z.object({
              scenarioId: z.string().uuid(),
              scenarioName: z.string(),
              weight: z.number(),
            })
          ),
        })
      )
    )
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      // Collect indicator IDs that already have at least one approved event.
      const approvedRows = await db
        .selectDistinct({ id: signalEvents.indicatorId })
        .from(signalEvents)
        .where(eq(signalEvents.status, "approved"));
      const approvedIds = approvedRows.map((r) => r.id);

      // Fetch indicator↔scenario links for this theme, excluding fulfilled indicators.
      const baseWhere = and(
        eq(scenarios.themeId, input.themeId),
        eq(scenarios.analystGroupId, groupId)
      );
      const whereClause =
        approvedIds.length > 0
          ? and(baseWhere, notInArray(indicators.id, approvedIds))
          : baseWhere;

      const rows = await db
        .select({
          indicatorId: indicators.id,
          indicatorName: indicators.name,
          strength: indicators.strength,
          scenarioId: scenarios.id,
          scenarioName: scenarios.name,
          weight: scenarioIndicatorMap.weight,
        })
        .from(scenarioIndicatorMap)
        .innerJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
        .innerJoin(scenarios, eq(scenarios.id, scenarioIndicatorMap.scenarioId))
        .where(whereClause);

      // Group by indicator and compute totalWeight.
      const indMap = new Map<
        string,
        { indicatorId: string; indicatorName: string; strength: number; totalWeight: number; scenarios: { scenarioId: string; scenarioName: string; weight: number }[] }
      >();

      for (const row of rows) {
        if (!indMap.has(row.indicatorId)) {
          indMap.set(row.indicatorId, {
            indicatorId: row.indicatorId,
            indicatorName: row.indicatorName,
            strength: row.strength,
            totalWeight: 0,
            scenarios: [],
          });
        }
        const entry = indMap.get(row.indicatorId)!;
        entry.totalWeight += row.weight;
        entry.scenarios.push({ scenarioId: row.scenarioId, scenarioName: row.scenarioName, weight: row.weight });
      }

      return Array.from(indMap.values()).sort((a, b) => b.totalWeight - a.totalWeight);
    }),

  exportMarkdown: protectedProcedure
    .input(
      z.object({
        themeId: z.string().uuid(),
        window: z.enum(["7d", "30d", "90d"]),
      })
    )
    .output(z.string())
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      // Fetch theme name.
      const themeRows = await db
        .select({ name: themes.name })
        .from(themes)
        .where(eq(themes.id, input.themeId))
        .limit(1);
      const themeName = themeRows[0]?.name ?? input.themeId;

      // Reuse generateAssessment logic inline (avoids calling tRPC from tRPC).
      const windowDays = WINDOW_DAYS[input.window];

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

      const evidenceRows = scenarioRows.length
        ? await db
            .select({
              scenarioId: scenarioIndicatorMap.scenarioId,
              indicatorId: indicators.id,
              indicatorName: indicators.name,
              strength: indicators.strength,
              timeWeight: indicators.timeWeight,
              eventId: signalEvents.id,
              eventTitle: signalEvents.title,
              eventSourceUrl: signalEvents.sourceUrl,
            })
            .from(scenarioIndicatorMap)
            .innerJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
            .leftJoin(
              signalEvents,
              sql`${signalEvents.indicatorId} = ${indicators.id}
                  AND ${signalEvents.status} = 'approved'
                  AND ${signalEvents.createdAt} >= NOW() - INTERVAL '1 day' * ${windowDays}`
            )
            .where(
              inArray(
                scenarioIndicatorMap.scenarioId,
                scenarioRows.map((r) => r.scenarioId)
              )
            )
        : [];

      // Build nested indicator→events map.
      type IndEntry = { indicatorId: string; indicatorName: string; strength: number; timeWeight: string; events: { eventId: string; title: string | null; sourceUrl: string | null }[] };
      const evMap = new Map<string, Map<string, IndEntry>>();
      for (const row of evidenceRows) {
        if (!evMap.has(row.scenarioId)) evMap.set(row.scenarioId, new Map());
        const imap = evMap.get(row.scenarioId)!;
        if (!imap.has(row.indicatorId)) {
          imap.set(row.indicatorId, { indicatorId: row.indicatorId, indicatorName: row.indicatorName, strength: row.strength, timeWeight: row.timeWeight, events: [] });
        }
        if (row.eventId) {
          imap.get(row.indicatorId)!.events.push({ eventId: row.eventId, title: row.eventTitle, sourceUrl: row.eventSourceUrl });
        }
      }

      // Research agenda.
      const approvedRows = await db
        .selectDistinct({ id: signalEvents.indicatorId })
        .from(signalEvents)
        .where(eq(signalEvents.status, "approved"));
      const approvedIds = approvedRows.map((r) => r.id);

      const baseWhere = and(eq(scenarios.themeId, input.themeId), eq(scenarios.analystGroupId, groupId));
      const agendaWhere = approvedIds.length > 0 ? and(baseWhere, notInArray(indicators.id, approvedIds)) : baseWhere;

      const agendaRows = await db
        .select({
          indicatorId: indicators.id,
          indicatorName: indicators.name,
          scenarioId: scenarios.id,
          scenarioName: scenarios.name,
          weight: scenarioIndicatorMap.weight,
        })
        .from(scenarioIndicatorMap)
        .innerJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
        .innerJoin(scenarios, eq(scenarios.id, scenarioIndicatorMap.scenarioId))
        .where(agendaWhere);

      // Serialise to Markdown.
      const date = new Date().toISOString().slice(0, 10);
      const lines: string[] = [
        `# Sentinel Assessment — ${themeName}`,
        ``,
        `**Window:** ${input.window} | **Generated:** ${date}`,
        ``,
      ];

      const warmer = scenarioRows.filter((s) => Number(s.delta) > 0);
      const neutral = scenarioRows.filter((s) => Number(s.delta) === 0);
      const colder = scenarioRows.filter((s) => Number(s.delta) < 0);

      const appendSection = (heading: string, rows: typeof scenarioRows) => {
        if (!rows.length) return;
        lines.push(`## ${heading}`, ``);
        for (const s of rows) {
          const sign = Number(s.delta) > 0 ? "+" : "";
          lines.push(`### ${s.scenarioName} (Δ ${sign}${Number(s.delta).toFixed(1)})`, ``);
          if (s.scenarioDescription) lines.push(s.scenarioDescription, ``);
          const indEntries = Array.from(evMap.get(s.scenarioId)?.values() ?? []);
          for (const ind of indEntries) {
            lines.push(`#### ${ind.indicatorName} (strength: ${ind.strength}, ${ind.timeWeight})`, ``);
            if (ind.events.length) {
              for (const ev of ind.events) {
                const link = ev.sourceUrl ? ` — [source](${ev.sourceUrl})` : "";
                lines.push(`- ${ev.title ?? "(untitled event)"}${link}`);
              }
            } else {
              lines.push(`- _No approved signal events in this window._`);
            }
            lines.push(``);
          }
        }
      };

      appendSection("Warmer Scenarios", warmer);
      appendSection("No Movement", neutral);
      appendSection("Colder Scenarios", colder);

      if (agendaRows.length) {
        lines.push(`## Research Agenda`, ``);
        lines.push(`Indicators with no approved signal events:`, ``);
        for (const row of agendaRows) {
          lines.push(`- **${row.indicatorName}** — scenario: ${row.scenarioName}, weight: ${row.weight}`);
        }
        lines.push(``);
      }

      return lines.join("\n");
    }),
});
