// server/src/trpc/routers/sources.ts
import { router, protectedProcedure } from "../trpc.js";
import { db } from "../db.js";
import { z } from "zod";
import { sources } from "@shared/db";
import { desc, eq, ilike, or, sql } from "drizzle-orm";
import { SourceCreateInput, SourceListInput, SourceUpdateInput } from "@shared";

export const sourcesRouter = router({
  list: protectedProcedure
    .input(SourceListInput.optional())
    .query(async ({ input }) => {
      const q = input?.q?.trim();
      const limit = input?.limit ?? 100;

      const where = q
        ? or(
            ilike(sources.url, `%${q}%`),
            ilike(sql`coalesce(${sources.title}, '')`, `%${q}%`),
          )
        : undefined;

      return db
        .select()
        .from(sources)
        .where(where)
        .orderBy(desc(sources.createdAt))
        .limit(limit);
    }),

  create: protectedProcedure
    .input(SourceCreateInput)
    .mutation(async ({ input }) => {
      const [row] = await db
        .insert(sources)
        .values({
          url: input.url,
          title: input.title,
          notes: input.notes,
        })
        .returning();
      return row;
    }),

  update: protectedProcedure
    .input(SourceUpdateInput)
    .mutation(async ({ input }) => {
      const [row] = await db
        .update(sources)
        .set({
          ...(input.url !== undefined ? { url: input.url } : {}),
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
          updatedAt: new Date(),
        })
        .where(eq(sources.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await db.delete(sources).where(eq(sources.id, input.id));
      return { ok: true };
    }),
});
