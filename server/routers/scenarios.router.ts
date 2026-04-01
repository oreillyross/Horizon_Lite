import { TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import { protectedProcedure, router } from "../trpc";
import {
  createScenarioInputSchema,
  updateScenarioInputSchema,
  scenarioIdSchema,
} from "../../shared";

// In-memory store until the DB migration runs
type ScenarioRecord = {
  id: string;
  analystGroupId: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

const store: ScenarioRecord[] = [];

function groupScenarios(groupId: string) {
  return store.filter((s) => s.analystGroupId === groupId);
}

function findScenario(id: string, groupId: string) {
  return store.find((s) => s.id === id && s.analystGroupId === groupId) ?? null;
}

export const scenariosRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
    return groupScenarios(groupId).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }),

  getById: protectedProcedure.input(scenarioIdSchema).query(({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
    const row = findScenario(input.id, groupId);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
    return row;
  }),

  create: protectedProcedure.input(createScenarioInputSchema).mutation(({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
    const now = new Date();
    const record: ScenarioRecord = {
      id: randomUUID(),
      analystGroupId: groupId,
      name: input.name.trim(),
      description: input.description.trim(),
      createdAt: now,
      updatedAt: now,
    };
    store.push(record);
    return record;
  }),

  update: protectedProcedure.input(updateScenarioInputSchema).mutation(({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
    const row = findScenario(input.id, groupId);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
    if (input.name !== undefined) row.name = input.name.trim();
    if (input.description !== undefined) row.description = input.description.trim();
    row.updatedAt = new Date();
    return row;
  }),

  delete: protectedProcedure.input(scenarioIdSchema).mutation(({ ctx, input }) => {
    const groupId = ctx.user.analystGroupId;
    if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
    const idx = store.findIndex((s) => s.id === input.id && s.analystGroupId === groupId);
    if (idx === -1) throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
    store.splice(idx, 1);
    return { success: true, id: input.id };
  }),
});
