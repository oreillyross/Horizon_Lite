import { z } from "zod";
import { eq, and, inArray, or, isNull, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { snippets, indicators, scenarios, scenarioIndicatorMap } from "@shared/db";
import { suggestIndicator } from "../lib/suggestIndicator";

async function visibleIndicatorIds(groupId: string): Promise<string[]> {
  const linkRows = await db
    .select({ indicatorId: scenarioIndicatorMap.indicatorId })
    .from(scenarioIndicatorMap)
    .innerJoin(scenarios, eq(scenarios.id, scenarioIndicatorMap.scenarioId))
    .where(eq(scenarios.analystGroupId, groupId));
  return [...new Set(linkRows.map((r) => r.indicatorId))];
}

const snippetOutputSchema = z.object({
  id: z.string(),
  quote: z.string().nullable(),
  content: z.string(),
  sourceUrl: z.string().nullable(),
  pubDate: z.string().nullable(),
  indicatorId: z.string().nullable(),
  indicatorName: z.string().nullable(),
  analystNotes: z.string().nullable(),
  aiSuggestedIndicatorId: z.string().nullable(),
  createdAt: z.string(),
});

export const horizonSnippetsRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .output(snippetOutputSchema)
    .query(async ({ ctx, input }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      const [row] = await db
        .select({
          id: snippets.id,
          quote: snippets.quote,
          content: snippets.content,
          sourceUrl: snippets.sourceUrl,
          pubDate: snippets.pubDate,
          indicatorId: snippets.indicatorId,
          indicatorName: indicators.name,
          analystNotes: snippets.analystNotes,
          aiSuggestedIndicatorId: snippets.aiSuggestedIndicatorId,
          createdAt: snippets.createdAt,
        })
        .from(snippets)
        .leftJoin(indicators, eq(indicators.id, snippets.indicatorId))
        .where(eq(snippets.id, input.id));

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snippet not found" });
      }

      return {
        ...row,
        pubDate: row.pubDate ? row.pubDate.toISOString() : null,
        createdAt: row.createdAt.toISOString(),
      };
    }),

  list: protectedProcedure
    .output(
      z.array(
        z.object({
          id: z.string(),
          quote: z.string().nullable(),
          content: z.string(),
          sourceUrl: z.string().nullable(),
          pubDate: z.string().nullable(),
          indicatorId: z.string().nullable(),
          indicatorName: z.string().nullable(),
          analystNotes: z.string().nullable(),
          aiSuggestedIndicatorId: z.string().nullable(),
          createdAt: z.string(),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const groupId = ctx.user.analystGroupId;
      if (!groupId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No analyst group" });
      }

      const indicatorIds = await visibleIndicatorIds(groupId);

      const rows = await db
        .select({
          id: snippets.id,
          quote: snippets.quote,
          content: snippets.content,
          sourceUrl: snippets.sourceUrl,
          pubDate: snippets.pubDate,
          indicatorId: snippets.indicatorId,
          indicatorName: indicators.name,
          analystNotes: snippets.analystNotes,
          aiSuggestedIndicatorId: snippets.aiSuggestedIndicatorId,
          createdAt: snippets.createdAt,
        })
        .from(snippets)
        .leftJoin(indicators, eq(indicators.id, snippets.indicatorId))
        .where(
          or(
            isNull(snippets.indicatorId),
            indicatorIds.length > 0 ? inArray(snippets.indicatorId, indicatorIds) : undefined,
          ),
        )
        .orderBy(desc(snippets.createdAt));

      return rows.map((r) => ({
        ...r,
        pubDate: r.pubDate ? r.pubDate.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      }));
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        indicatorId: z.string().uuid().nullable().optional(),
        analystNotes: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const values: Partial<typeof snippets.$inferInsert> = {};
      if (input.indicatorId !== undefined) values.indicatorId = input.indicatorId;
      if (input.analystNotes !== undefined) values.analystNotes = input.analystNotes;

      const [row] = await db
        .update(snippets)
        .set(values)
        .where(eq(snippets.id, input.id))
        .returning({ id: snippets.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snippet not found" });
      }
      return { id: row.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const [row] = await db
        .delete(snippets)
        .where(eq(snippets.id, input.id))
        .returning({ id: snippets.id });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Snippet not found" });
      }
      return { id: row.id };
    }),

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

      const indicatorIds = await visibleIndicatorIds(groupId);

      if (indicatorIds.length === 0) {
        return { suggestedIndicatorId: null };
      }

      const indRows = await db
        .select({ id: indicators.id, name: indicators.name, description: indicators.description })
        .from(indicators)
        .where(inArray(indicators.id, indicatorIds));

      const suggested = await suggestIndicator(input.quote, indRows);
      return { suggestedIndicatorId: suggested };
    }),
});
