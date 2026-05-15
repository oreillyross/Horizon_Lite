import { z } from "zod";
import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { snippets, indicators, scenarios, scenarioIndicatorMap } from "@shared/db";
import { suggestIndicator } from "../lib/suggestIndicator";

export const horizonSnippetsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        quote: z.string().min(1),
        sourceUrl: z.string().optional(),
        pubDate: z.string().datetime().optional(),
        indicatorId: z.string().uuid().optional(),
        analystNotes: z.string().optional(),
        aiSuggestedIndicatorId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(snippets)
        .values({
          quote: input.quote,
          content: input.quote,
          sourceUrl: input.sourceUrl ?? null,
          pubDate: input.pubDate ? new Date(input.pubDate) : null,
          indicatorId: input.indicatorId ?? null,
          analystNotes: input.analystNotes ?? null,
          aiSuggestedIndicatorId: input.aiSuggestedIndicatorId ?? null,
        })
        .returning({ id: snippets.id });
      return { id: row.id };
    }),

  suggestIndicator: protectedProcedure
    .input(z.object({ quote: z.string().min(1) }))
    .output(z.object({ suggestedIndicatorId: z.string().uuid().nullable() }))
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      const linkRows = await db
        .select({ indicatorId: scenarioIndicatorMap.indicatorId })
        .from(scenarioIndicatorMap)
        .innerJoin(scenarios, eq(scenarios.id, scenarioIndicatorMap.scenarioId))
        .where(eq(scenarios.analystGroupId, groupId));

      if (linkRows.length === 0) {
        return { suggestedIndicatorId: null };
      }

      const indicatorIds = [...new Set(linkRows.map((r) => r.indicatorId))];

      const indRows = await db
        .select({ id: indicators.id, name: indicators.name, description: indicators.description })
        .from(indicators)
        .where(inArray(indicators.id, indicatorIds));

      const suggested = await suggestIndicator(input.quote, indRows);
      return { suggestedIndicatorId: suggested };
    }),
});
