import { z } from "zod";
import { eq, and, inArray, ilike, SQL } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { indicators, scenarioIndicatorMap, scenarios, signalEvents } from "@shared/db";
import {
  IndicatorSummarySchema,
  IndicatorStatusSchema,
  IndicatorCategorySchema,
  EvidenceSummarySchema,
  IsoDateTimeSchema,
  createIndicatorInputSchema,
} from "../../shared";

const IndicatorUpdateSchema = createInsertSchema(indicators)
  .omit({ id: true, createdAt: true })
  .partial();

const IndicatorDetailSchema = z.object({
  indicator: IndicatorSummarySchema,
  trend: z.array(
    z.object({
      date: z.string(),
      currentValue: z.number(),
      baselineValue: z.number(),
    }),
  ),
  triggerHistory: z.array(
    z.object({ at: IsoDateTimeSchema, value: z.number() }),
  ),
  linkedEvidence: z.array(EvidenceSummarySchema),
  scenarioImpact: z.array(
    z.object({
      scenarioId: z.string(),
      scenarioName: z.string(),
      weight: z.number(),
    }),
  ),
});

export const signalsRouter = router({
  listIndicators: protectedProcedure
    .input(
      z
        .object({
          themeId: z.string().uuid().optional(),
          status: IndicatorStatusSchema.optional(),
          category: IndicatorCategorySchema.optional(),
          q: z.string().optional(),
        })
        .optional(),
    )
    .output(z.array(IndicatorSummarySchema))
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      // Resolve indicator IDs visible to this group (scoped through scenarios)
      const mapConditions: SQL[] = [eq(scenarios.analystGroupId, groupId)];
      if (input?.themeId) mapConditions.push(eq(scenarios.themeId, input.themeId));

      const linkRows = await db
        .select({
          indicatorId: scenarioIndicatorMap.indicatorId,
          scenarioId: scenarioIndicatorMap.scenarioId,
          scenarioName: scenarios.name,
          weight: scenarioIndicatorMap.weight,
          themeId: scenarios.themeId,
        })
        .from(scenarioIndicatorMap)
        .innerJoin(scenarios, eq(scenarios.id, scenarioIndicatorMap.scenarioId))
        .where(and(...mapConditions));

      if (linkRows.length === 0) return [];

      const indicatorIds = [...new Set(linkRows.map((r) => r.indicatorId))];

      const indConditions: SQL[] = [inArray(indicators.id, indicatorIds)];
      if (input?.status) indConditions.push(eq(indicators.status, input.status));
      if (input?.category) indConditions.push(eq(indicators.category, input.category));
      if (input?.q) indConditions.push(ilike(indicators.name, `%${input.q}%`));

      const indRows = await db
        .select()
        .from(indicators)
        .where(and(...indConditions));

      // Build per-indicator scenario maps and derive themeId from first link
      const mappedScenariosById = new Map<string, { scenarioId: string; weight: number; scenarioName: string }[]>();
      const themeByIndicator = new Map<string, string>();

      for (const link of linkRows) {
        if (!mappedScenariosById.has(link.indicatorId)) {
          mappedScenariosById.set(link.indicatorId, []);
          themeByIndicator.set(link.indicatorId, link.themeId ?? "");
        }
        mappedScenariosById.get(link.indicatorId)!.push({
          scenarioId: link.scenarioId,
          weight: link.weight,
          scenarioName: link.scenarioName,
        });
      }

      return indRows.map((ind) => ({
        id: ind.id,
        themeId: themeByIndicator.get(ind.id) ?? "",
        name: ind.name,
        category: ind.category as z.infer<typeof IndicatorCategorySchema>,
        status: (ind.status ?? "normal") as z.infer<typeof IndicatorStatusSchema>,
        currentValue: ind.currentValue ?? 0,
        baselineValue: ind.baselineValue ?? 0,
        accelerationScore: ind.accelerationScore ?? 0,
        lastTriggeredAt: ind.lastTriggeredAt?.toISOString() ?? null,
        mappedScenarios: mappedScenariosById.get(ind.id) ?? [],
        strength: ind.strength ?? 5,
        timeWeight: (ind.timeWeight ?? "week") as "day" | "week" | "month" | "year",
        decayBehaviour: (ind.decayBehaviour ?? "linear") as "linear" | "step" | "none",
        description: ind.description ?? null,
        regionScope: ind.regionScope ?? null,
      }));
    }),

  getIndicator: protectedProcedure
    .input(z.object({ indicatorId: z.string().uuid() }))
    .output(IndicatorDetailSchema)
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      const [ind] = await db
        .select()
        .from(indicators)
        .where(eq(indicators.id, input.indicatorId));

      if (!ind) throw new TRPCError({ code: "NOT_FOUND", message: "Indicator not found" });

      const linkRows = await db
        .select({
          scenarioId: scenarioIndicatorMap.scenarioId,
          weight: scenarioIndicatorMap.weight,
          scenarioName: scenarios.name,
          themeId: scenarios.themeId,
          analystGroupId: scenarios.analystGroupId,
        })
        .from(scenarioIndicatorMap)
        .innerJoin(scenarios, eq(scenarios.id, scenarioIndicatorMap.scenarioId))
        .where(
          and(
            eq(scenarioIndicatorMap.indicatorId, input.indicatorId),
            eq(scenarios.analystGroupId, groupId),
          ),
        );

      const themeId = linkRows[0]?.themeId ?? null;

      return {
        indicator: {
          id: ind.id,
          themeId: themeId ?? "",
          name: ind.name,
          category: ind.category as z.infer<typeof IndicatorCategorySchema>,
          status: (ind.status ?? "normal") as z.infer<typeof IndicatorStatusSchema>,
          currentValue: ind.currentValue ?? 0,
          baselineValue: ind.baselineValue ?? 0,
          accelerationScore: ind.accelerationScore ?? 0,
          lastTriggeredAt: ind.lastTriggeredAt?.toISOString() ?? null,
          mappedScenarios: linkRows.map((l) => ({
            scenarioId: l.scenarioId,
            weight: l.weight,
            scenarioName: l.scenarioName,
          })),
          strength: ind.strength ?? 5,
          timeWeight: (ind.timeWeight ?? "week") as "day" | "week" | "month" | "year",
          decayBehaviour: (ind.decayBehaviour ?? "linear") as "linear" | "step" | "none",
          description: ind.description ?? null,
          regionScope: ind.regionScope ?? null,
        },
        trend: [],
        triggerHistory: [],
        linkedEvidence: [],
        scenarioImpact: linkRows.map((l) => ({
          scenarioId: l.scenarioId,
          scenarioName: l.scenarioName,
          weight: l.weight,
        })),
      };
    }),

  createIndicator: protectedProcedure
    .input(createIndicatorInputSchema)
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      const { scenarioId, ...indicatorFields } = input;

      if (scenarioId) {
        const [scenario] = await db
          .select({ id: scenarios.id })
          .from(scenarios)
          .where(and(eq(scenarios.id, scenarioId), eq(scenarios.analystGroupId, groupId)));
        if (!scenario) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Scenario not found in your group" });
        }
      }

      const [row] = await db
        .insert(indicators)
        .values({ ...indicatorFields, scenarioId: scenarioId ?? null })
        .returning({ id: indicators.id });

      if (scenarioId) {
        await db.insert(scenarioIndicatorMap).values({
          scenarioId,
          indicatorId: row.id,
          weight: 1.0,
        });
      }

      return { id: row.id };
    }),

  updateIndicator: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: IndicatorUpdateSchema }))
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.analystGroupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }
      const [row] = await db
        .update(indicators)
        .set(input.data)
        .where(eq(indicators.id, input.id))
        .returning({ id: indicators.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Indicator not found" });
      return { id: row.id };
    }),

  deleteIndicator: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.analystGroupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }
      const [row] = await db
        .delete(indicators)
        .where(eq(indicators.id, input.id))
        .returning({ id: indicators.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Indicator not found" });
      return { id: row.id };
    }),

  listSuggestions: protectedProcedure
    .input(z.object({ indicatorId: z.string().uuid() }))
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          indicatorId: z.string().uuid(),
          title: z.string().nullable(),
          sourceUrl: z.string().nullable(),
          sourceHost: z.string().nullable(),
          score: z.number(),
          status: z.string(),
          createdAt: z.string(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user.analystGroupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      const rows = await db
        .select()
        .from(signalEvents)
        .where(
          and(
            eq(signalEvents.indicatorId, input.indicatorId),
            eq(signalEvents.status, "pending"),
          ),
        )
        .orderBy(signalEvents.createdAt);

      return rows.map((r) => ({
        id: r.id,
        indicatorId: r.indicatorId,
        title: r.title ?? null,
        sourceUrl: r.sourceUrl ?? null,
        sourceHost: r.sourceHost ?? null,
        score: r.score,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

  approveLink: protectedProcedure
    .input(z.object({ signalEventId: z.string().uuid() }))
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.analystGroupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }
      const [row] = await db
        .update(signalEvents)
        .set({ status: "approved" })
        .where(eq(signalEvents.id, input.signalEventId))
        .returning({ id: signalEvents.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Signal event not found" });
      return { id: row.id };
    }),

  dismissLink: protectedProcedure
    .input(z.object({ signalEventId: z.string().uuid() }))
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.analystGroupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }
      const [row] = await db
        .update(signalEvents)
        .set({ status: "dismissed" })
        .where(eq(signalEvents.id, input.signalEventId))
        .returning({ id: signalEvents.id });
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Signal event not found" });
      return { id: row.id };
    }),

  searchIndicators: protectedProcedure
    .input(
      z.object({
        q: z.string().optional(),
        excludeScenarioId: z.string().uuid().optional(),
      }),
    )
    .output(
      z.array(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          category: z.string(),
          strength: z.number(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user.analystGroupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      const conditions: SQL[] = [];
      if (input.q) conditions.push(ilike(indicators.name, `%${input.q}%`));

      const rows = await db
        .select({
          id: indicators.id,
          name: indicators.name,
          category: indicators.category,
          strength: indicators.strength,
        })
        .from(indicators)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .limit(50);

      if (!input.excludeScenarioId) {
        return rows.map((r) => ({ ...r, strength: r.strength ?? 5 }));
      }

      const linkedIds = await db
        .select({ indicatorId: scenarioIndicatorMap.indicatorId })
        .from(scenarioIndicatorMap)
        .where(eq(scenarioIndicatorMap.scenarioId, input.excludeScenarioId));

      const linkedSet = new Set(linkedIds.map((l) => l.indicatorId));

      return rows
        .filter((r) => !linkedSet.has(r.id))
        .map((r) => ({ ...r, strength: r.strength ?? 5 }));
    }),
});
