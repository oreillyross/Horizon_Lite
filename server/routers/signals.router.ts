import { z } from "zod";
import { eq, and, inArray, ilike, SQL } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { indicators, scenarioIndicatorMap, scenarios } from "@shared/db";
import {
  IndicatorSummarySchema,
  IndicatorStatusSchema,
  IndicatorCategorySchema,
  EvidenceSummarySchema,
  IsoDateTimeSchema,
} from "../../shared";

const IndicatorInsertSchema = createInsertSchema(indicators).omit({ id: true, createdAt: true });

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
      const mappedScenariosById = new Map<string, { scenarioId: string; weight: number }[]>();
      const themeByIndicator = new Map<string, string>();

      for (const link of linkRows) {
        if (!mappedScenariosById.has(link.indicatorId)) {
          mappedScenariosById.set(link.indicatorId, []);
          themeByIndicator.set(link.indicatorId, link.themeId);
        }
        mappedScenariosById.get(link.indicatorId)!.push({
          scenarioId: link.scenarioId,
          weight: link.weight,
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

      if (linkRows.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Indicator not found" });
      }

      const themeId = linkRows[0].themeId;

      return {
        indicator: {
          id: ind.id,
          themeId,
          name: ind.name,
          category: ind.category as z.infer<typeof IndicatorCategorySchema>,
          status: (ind.status ?? "normal") as z.infer<typeof IndicatorStatusSchema>,
          currentValue: ind.currentValue ?? 0,
          baselineValue: ind.baselineValue ?? 0,
          accelerationScore: ind.accelerationScore ?? 0,
          lastTriggeredAt: ind.lastTriggeredAt?.toISOString() ?? null,
          mappedScenarios: linkRows.map((l) => ({ scenarioId: l.scenarioId, weight: l.weight })),
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
    .input(IndicatorInsertSchema)
    .output(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user.analystGroupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }
      const [row] = await db.insert(indicators).values(input).returning({ id: indicators.id });
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
});
