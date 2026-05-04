import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";
import { db } from "../db";
import { scenarios } from "@shared/db";
import {
  createScenarioInputSchema,
  updateScenarioInputSchema,
  scenarioIdSchema,
} from "../../shared";

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
        .select()
        .from(scenarios)
        .where(conditions)
        .orderBy(desc(scenarios.updatedAt));
    }),

  getById: protectedProcedure.input(scenarioIdSchema).query(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [row] = await db
      .select()
      .from(scenarios)
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
        themeId: input.themeId,
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
});
