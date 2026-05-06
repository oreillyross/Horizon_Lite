import { z } from "zod";
import { eq, and, gte, lte, SQL } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { db } from "../db";
import { signalEvents, scenarioIndicatorMap, scenarios, indicators } from "@shared/db";
import { BeliefUpdateSchema } from "../../shared";

export const updatesRouter = router({
  listUpdates: protectedProcedure
    .input(
      z
        .object({
          themeId: z.string().optional(),
          scenarioId: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          majorOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .output(z.array(BeliefUpdateSchema))
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });

      const conditions: SQL[] = [eq(scenarios.analystGroupId, groupId)];
      if (input?.themeId) conditions.push(eq(scenarios.themeId, input.themeId));
      if (input?.scenarioId) conditions.push(eq(scenarios.id, input.scenarioId));
      if (input?.from) conditions.push(gte(signalEvents.createdAt, new Date(input.from)));
      if (input?.to) conditions.push(lte(signalEvents.createdAt, new Date(input.to)));

      const rows = await db
        .select({
          eventId: signalEvents.id,
          eventScore: signalEvents.score,
          eventCreatedAt: signalEvents.createdAt,
          indicatorId: indicators.id,
          indicatorName: indicators.name,
          indicatorCurrentValue: indicators.currentValue,
          indicatorThresholdTrigger: indicators.thresholdTrigger,
          weight: scenarioIndicatorMap.weight,
          scenarioId: scenarios.id,
          themeId: scenarios.themeId,
        })
        .from(signalEvents)
        .innerJoin(scenarioIndicatorMap, eq(scenarioIndicatorMap.indicatorId, signalEvents.indicatorId))
        .innerJoin(scenarios, eq(scenarios.id, scenarioIndicatorMap.scenarioId))
        .innerJoin(indicators, eq(indicators.id, signalEvents.indicatorId))
        .where(and(...conditions));

      if (rows.length === 0) return [];

      // Group rows by scenario
      type Row = (typeof rows)[number];
      const byScenario = new Map<string, Row[]>();
      for (const row of rows) {
        if (!byScenario.has(row.scenarioId)) byScenario.set(row.scenarioId, []);
        byScenario.get(row.scenarioId)!.push(row);
      }

      const updates: z.infer<typeof BeliefUpdateSchema>[] = [];

      for (const [scenarioId, scenarioRows] of byScenario) {
        const latest = scenarioRows.reduce((a, b) =>
          a.eventCreatedAt > b.eventCreatedAt ? a : b,
        );

        // Deduplicate indicators for this scenario
        const indicatorMap = new Map<string, Row>();
        for (const r of scenarioRows) indicatorMap.set(r.indicatorId, r);
        const indicatorRows = [...indicatorMap.values()];

        // prior: mean(currentValue / thresholdTrigger) across linked indicators, clamped [0,1]
        const prior = Math.min(
          1,
          Math.max(
            0,
            indicatorRows.reduce((sum, r) => {
              const trigger = r.indicatorThresholdTrigger ?? 2.5;
              return sum + (r.indicatorCurrentValue ?? 0) / trigger;
            }, 0) / indicatorRows.length,
          ),
        );

        // posterior: prior + normalised weighted signal score delta, clamped [0,1]
        const totalWeight = scenarioRows.reduce((s, r) => s + r.weight, 0) || 1;
        const delta =
          scenarioRows.reduce((s, r) => s + (r.eventScore * r.weight) / totalWeight, 0) * 0.05;
        const posterior = Math.min(1, Math.max(0, prior + delta));

        const isMajor = Math.abs(posterior - prior) >= 0.05;
        if (input?.majorOnly && !isMajor) continue;

        updates.push({
          id: `upd_${scenarioId}`,
          themeId: latest.themeId,
          scenarioId,
          createdAt: latest.eventCreatedAt.toISOString(),
          prior,
          posterior,
          drivers: indicatorRows.map((r) => ({
            indicatorId: r.indicatorId,
            name: r.indicatorName,
          })),
          note: null,
        });
      }

      return updates;
    }),

  addNote: publicProcedure
    .input(
      z.object({ updateId: z.string(), note: z.string().min(1).max(2000) }),
    )
    .output(z.object({ ok: z.literal(true) }))
    .mutation(async () => {
      return { ok: true };
    }),
});
