import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { db } from "../db";
import { snippets } from "@shared/db";

export const horizonSnippetsRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        quote: z.string().min(1),
        sourceUrl: z.string().optional(),
        pubDate: z.string().datetime().optional(),
        indicatorId: z.string().uuid().optional(),
        analystNotes: z.string().optional(),
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
        })
        .returning({ id: snippets.id });
      return { id: row.id };
    }),
});
