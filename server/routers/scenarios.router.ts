import { TRPCError } from "@trpc/server";
import { desc, eq, and } from "drizzle-orm";
import { protectedProcedure, router } from "../trpc";
import { scenarios } from "../../shared/db/tables/scenarios";
import {
  createScenarioInputSchema,
  updateScenarioInputSchema,
  scenarioIdSchema,
} from "../../shared";

export const scenariosRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    return ctx.db
      .select()
      .from(scenarios)
      .where(eq(scenarios.analystGroupId, groupId))
      .orderBy(desc(scenarios.updatedAt));
  }),

  getById: protectedProcedure.input(scenarioIdSchema).query(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [row] = await ctx.db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)))
      .limit(1);

    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
    return row;
  }),

  create: protectedProcedure.input(createScenarioInputSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [created] = await ctx.db
      .insert(scenarios)
      .values({
        analystGroupId: groupId,
        name: input.name.trim(),
        description: input.description.trim(),
      })
      .returning();

    return created;
  }),

  update: protectedProcedure.input(updateScenarioInputSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [existing] = await ctx.db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)))
      .limit(1);

    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });

    const patch: Partial<typeof existing> = { updatedAt: new Date() };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description.trim();

    const [updated] = await ctx.db
      .update(scenarios)
      .set(patch)
      .where(eq(scenarios.id, input.id))
      .returning();

    return updated;
  }),

  delete: protectedProcedure.input(scenarioIdSchema).mutation(async ({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

    const [existing] = await ctx.db
      .select()
      .from(scenarios)
      .where(and(eq(scenarios.id, input.id), eq(scenarios.analystGroupId, groupId)))
      .limit(1);

    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });

    await ctx.db.delete(scenarios).where(eq(scenarios.id, input.id));
    return { success: true, id: input.id };
  }),
});
