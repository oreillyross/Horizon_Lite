import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { db } from "../db";
import { sql } from "drizzle-orm";

type FeedRow = {
  url: string
  domain: string
  title: string
  image_url: string | null
  published_at: string
  tone: number
  themes: string[]
  organizations: string[]
}

export const intelRouter = router({
  feed: publicProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().default(30),
      }).passthrough()
    )
    .query(async ({ input }) => {
      const rows = await db.execute(sql`
        SELECT
          url,
          domain,
          title,
          image_url,
          published_at,
          tone,
          themes,
          organizations
        FROM gdelt_documents
       WHERE published_at IS NOT NULL
AND ${
  input.cursor
    ? sql`published_at < ${input.cursor}::timestamptz`
    : sql`true`
}
        ORDER BY published_at DESC
        LIMIT ${input.limit}
      `);

      const items = rows.rows as FeedRow[];
      console.log("rows returned:", items.length)
      console.log({
        rows: items.length,
        nextCursor: items.at(-1)?.published_at
      });
      return {
        items,
        nextCursor:
        items.length === input.limit
          ? items.at(-1)?.published_at
          : undefined
      };
    }),
});