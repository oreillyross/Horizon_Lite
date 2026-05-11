import { z } from "zod";
import { eq, and, desc, sql, getTableColumns } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { scenarios, scenarioIndicatorMap, indicators, themes } from "@shared/db";
import {
  createScenarioInputSchema,
  updateScenarioInputSchema,
  scenarioIdSchema,
} from "../../shared";

const assignIndicatorSchema = z.object({
  scenarioId: z.string().uuid(),
  indicatorId: z.string().uuid(),
  weight: z.number().min(0.1).max(10).default(1.0),
});

const removeIndicatorSchema = z.object({
  scenarioId: z.string().uuid(),
  indicatorId: z.string().uuid(),
});

export const scenariosRouter = router({
  list: protectedProcedure
    .input(z.object({ themeId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      const conditions = input.themeId
        ? and(eq(scenarios.analystGroupId, groupId), eq(scenarios.themeId, input.themeId))
        : eq(scenarios.analystGroupId, groupId);

      return db
        .select({
          ...getTableColumns(scenarios),
          indicatorCount: sql<number>`cast(count(${scenarioIndicatorMap.indicatorId}) as int)`,
          themeName: themes.name,
        })
        .from(scenarios)
        .leftJoin(scenarioIndicatorMap, eq(scenarioIndicatorMap.scenarioId, scenarios.id))
        .leftJoin(themes, eq(themes.id, scenarios.themeId))
        .where(conditions)
        .groupBy(scenarios.id, themes.name)
        .orderBy(desc(scenarios.updatedAt));
    }),

  getById: protectedProcedure.input(scenarioIdSchema).query(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [row] = await db
      .select({ ...getTableColumns(scenarios), themeName: themes.name })
      .from(scenarios)
      .leftJoin(themes, eq(themes.id, scenarios.themeId))
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)));

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
    return row;
  }),

  create: protectedProcedure.input(createScenarioInputSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [row] = await db
      .insert(scenarios)
      .values({
        analystGroupId: groupId,
        themeId: input.themeId ?? null,
        name: input.name.trim(),
        description: input.description.trim(),
      })
      .returning();

    return row;
  }),

  update: protectedProcedure.input(updateScenarioInputSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const existing = await db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)));

    if (!existing.length) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });

    const [row] = await db
      .update(scenarios)
      .set({
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.description !== undefined && { description: input.description.trim() }),
        updatedAt: new Date(),
      })
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)))
      .returning();

    return row;
  }),

  delete: protectedProcedure.input(scenarioIdSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const deleted = await db
      .delete(scenarios)
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)))
      .returning({ id: scenarios.id });

    if (!deleted.length) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
    return { success: true, id: input.id };
  }),

  getLinkedIndicators: protectedProcedure.input(scenarioIdSchema).query(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [scenario] = await db
      .select({ id: scenarios.id })
      .from(scenarios)
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)));

    if (!scenario) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });

    const links = await db
      .select({
        indicatorId: scenarioIndicatorMap.indicatorId,
        weight: scenarioIndicatorMap.weight,
        name: indicators.name,
        category: indicators.category,
        strength: indicators.strength,
        status: indicators.status,
        timeWeight: indicators.timeWeight,
      })
      .from(scenarioIndicatorMap)
      .innerJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
      .where(eq(scenarioIndicatorMap.scenarioId, input.id));

    return links;
  }),

  assignIndicator: protectedProcedure.input(assignIndicatorSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [scenario] = await db
      .select({ id: scenarios.id })
      .from(scenarios)
      .where(and(eq(scenarios.id, input.scenarioId), eq(scenarios.analystGroupId, groupId)));

    if (!scenario) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });

    const [indicator] = await db
      .select({ id: indicators.id })
      .from(indicators)
      .where(eq(indicators.id, input.indicatorId));

    if (!indicator) throw new TRPCError({ code: "NOT_FOUND", message: "Indicator not found" });

    const existing = await db
      .select()
      .from(scenarioIndicatorMap)
      .where(
        and(
          eq(scenarioIndicatorMap.scenarioId, input.scenarioId),
          eq(scenarioIndicatorMap.indicatorId, input.indicatorId),
        ),
      );

    if (existing.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "Indicator already linked to this scenario" });
    }

    await db.insert(scenarioIndicatorMap).values({
      scenarioId: input.scenarioId,
      indicatorId: input.indicatorId,
      weight: input.weight,
    });

    return { success: true };
  }),

  removeIndicator: protectedProcedure.input(removeIndicatorSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [scenario] = await db
      .select({ id: scenarios.id })
      .from(scenarios)
      .where(and(eq(scenarios.id, input.scenarioId), eq(scenarios.analystGroupId, groupId)));

    if (!scenario) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });

    const deleted = await db
      .delete(scenarioIndicatorMap)
      .where(
        and(
          eq(scenarioIndicatorMap.scenarioId, input.scenarioId),
          eq(scenarioIndicatorMap.indicatorId, input.indicatorId),
        ),
      )
      .returning({ indicatorId: scenarioIndicatorMap.indicatorId });

    if (!deleted.length) throw new TRPCError({ code: "NOT_FOUND", message: "Link not found" });
    return { success: true };
  }),
});
